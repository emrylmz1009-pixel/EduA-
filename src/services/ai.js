/**
 * Helper to safely parse JSON from AI response, handling potential Markdown wraps.
 */
function parseJsonResponse(responseText) {
  const text = responseText.trim();
  try {
    return JSON.parse(text);
  } catch (e) {
    // Try to extract markdown code blocks if present
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
    const match = text.match(codeBlockRegex);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch (err) {
        console.error("Failed to parse JSON inside markdown block", err);
      }
    }
    
    // Fallback: extract array or object bounding
    const arrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch (err) {}
    }
    const objMatch = text.match(/\{\s*[\s\S]*\s*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]);
      } catch (err) {}
    }
    
    throw new Error("Yapay zekadan gelen yanıt geçerli bir JSON biçiminde değil.");
  }
}

/**
 * Truncate text to avoid model context limit or high token usage.
 */
function limitTextSize(text, maxChars = 60000) {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + "\n\n[...Metin çok uzun olduğu için devamı sınırlandırıldı...]";
}

/**
 * Makes HTTP POST request to OpenAI or Gemini API
 */
async function callApi(provider, apiKey, model, systemPrompt, userPrompt, isJson = true) {
  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    // Combine system instructions and user prompt for Gemini
    const fullPrompt = `${systemPrompt}\n\nİçerik/Girdi:\n${userPrompt}`;
    
    const body = {
      contents: [
        {
          parts: [
            { text: fullPrompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        ...(isJson ? { responseMimeType: 'application/json' } : {})
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `Sunucu hatası (Kod: ${response.status})`;
      throw new Error(`Gemini API Hatası: ${errMsg}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) {
      throw new Error("Gemini API'den boş yanıt döndü.");
    }
    
    return isJson ? parseJsonResponse(generatedText) : generatedText;

  } else if (provider === 'openai') {
    const url = 'https://api.openai.com/v1/chat/completions';
    
    const body = {
      model: model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.3,
      ...(isJson ? { response_format: { type: 'json_object' } } : {})
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `Sunucu hatası (Kod: ${response.status})`;
      throw new Error(`OpenAI API Hatası: ${errMsg}`);
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content;
    if (!generatedText) {
      throw new Error("OpenAI API'den boş yanıt döndü.");
    }

    return isJson ? parseJsonResponse(generatedText) : generatedText;
  } else {
    throw new Error('Bilinmeyen API sağlayıcısı.');
  }
}

/**
 * Service methods
 */
export const aiService = {
  /**
   * Test API connectivity
   */
  async testConnection(provider, apiKey, model) {
    const systemPrompt = "Bunu okuyorsan bağlantı başarılı demektir. Sadece Türkçe 'Bağlantı başarılı!' yaz.";
    const userPrompt = "Bağlantıyı test et.";
    
    const result = await callApi(provider, apiKey, model, systemPrompt, userPrompt, false);
    return result;
  },

  /**
   * Generate Summary
   */
  async generateSummary(provider, apiKey, model, pdfText) {
    const systemPrompt = `Sen profesyonel bir eğitim asistanısın. Aşağıdaki ders notu veya döküman metnini analiz ederek Türkçe dilinde kapsamlı, anlaşılır ve yapılandırılmış bir özet oluştur. 
Yanıtını mutlaka aşağıdaki JSON yapısında döndürmelisin:
{
  "title": "Dökümanın Başlığı (Mümkünse metinden çıkar, yoksa genel bir başlık ver)",
  "executiveSummary": "Dökümanın genel amacını, ana fikirlerini ve en kritik çıkarımlarını içeren 3-4 paragraflık metin.",
  "keyConcepts": [
    { "term": "Kritik Kavram, Terim veya Tarih", "definition": "Bu kavramın detaylı tanımı ve ders için önemi" }
  ],
  "timeline": [
    { "date": "Tarih, dönem veya süreç aşaması", "event": "Olayın veya sürecin açıklaması" }
  ],
  "studyGuide": [
    { "sectionTitle": "Alt Başlık (Örn: Giriş, Yöntem, Sonuçlar vb.)", "content": "Bu bölüm altındaki önemli çalışma notları, maddeler halinde detaylı açıklamalar." }
  ]
}

Eğer metinde tarihsel veya süreç bazlı adımlar bulunmuyorsa, 'timeline' alanını boş bir array [] olarak bırak.`;

    const cleanText = limitTextSize(pdfText);
    return await callApi(provider, apiKey, model, systemPrompt, cleanText, true);
  },

  /**
   * Generate Flashcards
   */
  async generateFlashcards(provider, apiKey, model, pdfText) {
    const systemPrompt = `Sen bir eğitim asistanısın. Aşağıdaki ders notundan öğrencilerin ezberlemesi ve tekrar yapması gereken en önemli terim, kavram, soru ve cevapları çıkararak Türkçe interaktif bilgi kartları (flashcards) oluştur.
Yanıtını mutlaka şu JSON array formatında döndür:
[
  {
    "question": "Kartın ön yüzü: Soru, terim veya eksik kelimeli cümle (Örn: Türkiye'nin başkenti neresidir?)",
    "answer": "Kartın arka yüzü: Cevap veya detaylı tanım (Örn: Ankara)",
    "category": "İlgili alt başlık veya ders alanı (Örn: Coğrafya)"
  }
]
Öğrencinin konuyu derinlemesine pekiştirebilmesi için en az 10, en fazla 15 adet benzersiz kart oluştur.`;

    const cleanText = limitTextSize(pdfText);
    return await callApi(provider, apiKey, model, systemPrompt, cleanText, true);
  },

  /**
   * Generate Quiz
   */
  async generateQuiz(provider, apiKey, model, pdfText) {
    const systemPrompt = `Sen deneyimli bir öğretmensin. Aşağıdaki metni okuyarak öğrencilerin konuyu anlama seviyelerini ölçecek kaliteli Türkçe test soruları oluştur.
Sorular çoktan seçmeli (4 şıklı) veya doğru-yanlış türünde olmalıdır.
Yanıtını mutlaka şu JSON array formatında döndür:
[
  {
    "question": "Soru metni...",
    "options": ["A Seçeneği", "B Seçeneği", "C Seçeneği", "D Seçeneği"],
    "correctAnswerIndex": 0,
    "type": "multiple-choice",
    "category": "Sorunun ait olduğu alt konu başlığı",
    "explanation": "Doğru cevabın neden doğru olduğunu ve konunun püf noktasını açıklayan 2-3 cümlelik eğitici açıklama."
  }
]

Doğru-Yanlış soruları için 'options' dizisi sadece ["Doğru", "Yanlış"] elemanlarını içermeli, 'correctAnswerIndex' 0 veya 1 olmalı ve 'type' alanı 'true-false' olmalıdır.
Konunun genelini kapsayacak şekilde toplamda 10 adet soru oluştur. Sınav kalitesinde sorular hazırla.`;

    const cleanText = limitTextSize(pdfText);
    return await callApi(provider, apiKey, model, systemPrompt, cleanText, true);
  },

  /**
   * Time Capsule / Weakness Review Flashcard Generation
   */
  async generateWeaknessReview(provider, apiKey, model, pdfText, weakTopics, wrongQuestions) {
    const systemPrompt = `Sen öğrenme analitiği ve kişiselleştirilmiş eğitim uzmanısın. 
Öğrenci bu ders notu üzerinde yaptığı testlerde bazı konularda zayıf kalmış ve hatalı yanıtlar vermiştir.
Öğrencinin Zayıf Konuları: ${weakTopics.join(', ')}
Öğrencinin Hata Yaptığı Bazı Sorular:
${wrongQuestions.map((q, idx) => `${idx + 1}. Soru: ${q.question} -> Öğrenci Yanıtı: ${q.userAnswer} (Doğru Yanıt: ${q.correctAnswer})`).join('\n')}

Yukarıdaki eksiklikleri gidermek amacıyla, aşağıdaki ders notunu referans alarak öğrenciye özel 'Düzeltici/Destekleyici Çalışma Kartları' oluştur. Bu kartlar öğrencinin zihnindeki yanlış algıları düzeltmeli ve eksik kaldığı konuyu doğrusuyla öğretmelidir.
Yanıtını mutlaka şu JSON array formatında döndür:
[
  {
    "question": "Zayıf olunan konuyu veya hatayı hedefleyen düzeltici soru/kavram",
    "answer": "Hatanın nedenini açıklayan ve doğrusunu akılda kalıcı şekilde öğreten detaylı cevap",
    "category": "Zayıf bulunup desteklenen konu alanı"
  }
]
Toplamda 6-8 adet çok nokta atışı düzeltici kart oluştur.`;

    const cleanText = limitTextSize(pdfText);
    return await callApi(provider, apiKey, model, systemPrompt, cleanText, true);
  }
};
