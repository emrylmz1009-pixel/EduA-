/**
 * Helper to safely parse JSON from AI response, handling potential Markdown wraps.
 */
function parseJsonResponse(responseText) {
  const text = responseText.trim();
  try {
    return JSON.parse(text);
  } catch (e) {
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
    const match = text.match(codeBlockRegex);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch (err) {
        console.error("Failed to parse JSON inside markdown block", err);
      }
    }
    
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

function limitTextSize(text, maxChars = 60000) {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + "\n\n[...Metin sınırlandırıldı...]";
}

async function callApi(provider, apiKey, model, systemPrompt, userPrompt, isJson = true, mediaData = null) {
  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const parts = [];
    
    // Add media if present (multimodal inline data)
    if (mediaData) {
      parts.push({
        inlineData: {
          mimeType: mediaData.mimeType,
          data: mediaData.base64
        }
      });
    }
    
    parts.push({ text: `${systemPrompt}\n\nİçerik/Girdi:\n${userPrompt}` });
    
    const body = {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.3,
        ...(isJson ? { responseMimeType: 'application/json' } : {})
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    
    let contentParts = userPrompt;
    
    // Support image multimodal for OpenAI (Audio is skipped for OpenAI completions)
    if (mediaData && mediaData.mimeType.startsWith('image/')) {
      contentParts = [
        { type: 'text', text: userPrompt },
        { type: 'image_url', image_url: { url: `data:${mediaData.mimeType};base64,${mediaData.base64}` } }
      ];
    }
    
    const body = {
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contentParts }
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

export const aiService = {
  async testConnection(provider, apiKey, model) {
    const systemPrompt = "Bunu okuyorsan bağlantı başarılı demektir. Sadece Türkçe 'Bağlantı başarılı!' yaz.";
    const userPrompt = "Bağlantıyı test et.";
    return await callApi(provider, apiKey, model, systemPrompt, userPrompt, false);
  },

  /**
   * Performs OCR on an uploaded image file using Gemini/OpenAI multimodal APIs.
   */
  async performOcr(provider, apiKey, model, base64Image, mimeType) {
    const systemPrompt = "Sen güçlü bir OCR asistanısın. Görseldeki tüm yazılı metinleri, el yazısı notları veya döküman sayfalarını oku ve Türkçe metin olarak çıkar. Başka hiçbir açıklama ekleme, sadece okuduğun metni döndür.";
    const userPrompt = "Bu görseldeki metni çıkar.";
    return await callApi(provider, apiKey, model, systemPrompt, userPrompt, false, { base64: base64Image, mimeType });
  },

  /**
   * Processes uploaded audio files using Gemini's native audio capabilities.
   */
  async processAudio(provider, apiKey, model, base64Audio, mimeType) {
    if (provider === 'openai') {
      throw new Error('OpenAI chat entegrasyonu doğrudan ses dosyası analizini desteklememektedir. Lütfen Google Gemini kullanın.');
    }
    const systemPrompt = "Sen bir sesli ders notu çözümleyicisisin. Dinlediğin ses kaydındaki ders anlatımını Türkçe metne dök ve önemli noktaları özetle.";
    const userPrompt = "Bu ses kaydını analiz et ve metne dök.";
    return await callApi(provider, apiKey, model, systemPrompt, userPrompt, false, { base64: base64Audio, mimeType });
  },

  /**
   * Extended Summary with Length selection, Glossary, and Mind Map.
   */
  async generateSummary(provider, apiKey, model, pdfText, length = 'Orta') {
    const lengthInstructions = {
      'Kısa': 'Oldukça kısa, özet ve sadece 1-2 paragraflık genel fikirler ile en temel 5 kavramdan oluşsun.',
      'Orta': 'Kapsamlı ve dengeli bir özet olsun, 3-4 paragraflık genel özet ile 8-10 temel kavramı içersin.',
      'Detaylı': 'Son derece ayrıntılı bir çalışma rehberi niteliğinde olsun. Önemli tüm detayları, üniteleri, formülleri ve açıklamaları barındırsın.'
    };

    const systemPrompt = `Sen profesyonel bir eğitim asistanısın. Aşağıdaki ders notu veya döküman metnini analiz ederek Türkçe dilinde kapsamlı, anlaşılır ve yapılandırılmış bir çalışma özeti oluştur.
İstenen özet uzunluk tipi: ${length} (${lengthInstructions[length]}).

Yanıtını mutlaka aşağıdaki JSON yapısında döndürmelisin:
{
  "title": "Dökümanın Başlığı (Mümkünse metinden çıkar, yoksa genel bir başlık ver)",
  "executiveSummary": "İstenen uzunluğa uygun genel özet metni.",
  "keyConcepts": [
    { "term": "Kritik Kavram, Terim veya Tarih", "definition": "Bu kavramın detaylı tanımı ve ders için önemi" }
  ],
  "timeline": [
    { "date": "Tarih, dönem veya süreç aşaması", "event": "Olayın veya sürecin açıklaması" }
  ],
  "studyGuide": [
    { "sectionTitle": "Alt Başlık", "content": "Bu bölüm altındaki önemli çalışma notları, maddeler halinde detaylı açıklamalar." }
  ],
  "glossary": [
    { "term": "Teknik/Yabancı Terim", "definition": "Terimin kısa sözlük tanımı" }
  ],
  "mindMap": "Mermaid.js zihin haritası kodu (graph TD ile başlayan, kavramların birbiriyle ilişkisini gösteren basit hiyerarşik yapı. Türkçe olmalı ve html tagi içermemeli. Örn: graph TD\\n  A[Başlık] --> B[Kavram1])"
}

Eğer metinde tarihsel veya süreç bazlı adımlar bulunmuyorsa, 'timeline' alanını boş bir array [] olarak bırak.`;

    const cleanText = limitTextSize(pdfText);
    return await callApi(provider, apiKey, model, systemPrompt, cleanText, true);
  },

  /**
   * Chat interface for Ask PDF.
   */
  async chatWithPdf(provider, apiKey, model, pdfText, chatHistory, userQuestion) {
    const systemPrompt = `Sen ders notu üzerinde öğrencilere yardımcı olan akıllı bir asistansın. Aşağıdaki ders notunu temel alarak öğrencinin sorusunu yanıtla.
Notun dışına çıkma, bilmediğin konulara notta yer almıyorsa dürüstçe notta bulunmadığını söyle. Yanıtların eğitici ve açıklayıcı olsun.

DERS METNİ:
${limitTextSize(pdfText, 30000)}

Önceki Sohbet Geçmişi:
${chatHistory.map(h => `${h.role === 'user' ? 'Öğrenci' : 'Asistan'}: ${h.text}`).join('\n')}`;

    return await callApi(provider, apiKey, model, systemPrompt, userQuestion, false);
  },

  /**
   * Generates specialized quizzes (blanks, matching, written, or standard multiple-choice).
   */
  async generateQuiz(provider, apiKey, model, pdfText, format = 'multiple-choice', difficulty = 'Orta') {
    let formatPrompt = '';
    
    if (format === 'multiple-choice') {
      formatPrompt = `Çoktan seçmeli sorular hazırla. Yanıtını mutlaka şu JSON array formatında döndür:
[
  {
    "question": "Soru metni...",
    "options": ["A Seçeneği", "B Seçeneği", "C Seçeneği", "D Seçeneği"],
    "correctAnswerIndex": 0,
    "type": "multiple-choice",
    "category": "Alt başlık",
    "explanation": "Detaylı eğitici açıklama."
  }
]`;
    } else if (format === 'true-false') {
      formatPrompt = `Doğru-Yanlış soruları hazırla. Yanıtını mutlaka şu JSON array formatında döndür:
[
  {
    "question": "Soru metni...",
    "options": ["Doğru", "Yanlış"],
    "correctAnswerIndex": 0, // veya 1
    "type": "true-false",
    "category": "Alt başlık",
    "explanation": "Detaylı eğitici açıklama."
  }
]`;
    } else if (format === 'blanks') {
      formatPrompt = `Boşluk doldurma soruları hazırla. Cümlenin içindeki tek bir kritik kavramı boş bırak ve yerine alt çizgi (______) koy. Yanıtını mutlaka şu JSON array formatında döndür:
[
  {
    "question": "Türkiye'nin başkenti ______ şehridir.",
    "correctAnswer": "Ankara",
    "type": "blanks",
    "category": "Alt başlık",
    "explanation": "Bu boşluğu dolduran kavramın nedeni ve açıklaması."
  }
]`;
    } else if (format === 'matching') {
      formatPrompt = `Terim ve açıklama eşleştirme testi oluştur. Sol sütunda terimler, sağ sütunda ise açıklamalar olsun. Yanıtını mutlaka şu JSON nesnesi formatında döndür:
{
  "type": "matching",
  "category": "Genel Konu",
  "pairs": [
    { "left": "Klorofil", "right": "Bitkilere yeşil renk veren ve fotosentezi sağlayan pigment" },
    { "left": "Mitokondri", "right": "Hücrenin enerji üretim merkezi" }
  ]
}
En az 5-6 çift oluştur.`;
    } else if (format === 'classical') {
      formatPrompt = `Açık uçlu / klasik yazılı sınav soruları hazırla. Öğrencinin yanıtı içermesi gereken anahtar kelimeleri de belirle. Yanıtını mutlaka şu JSON array formatında döndür:
[
  {
    "question": "Fotosentez sürecinde ışığın rolü nedir?",
    "idealKeywords": ["klorofil", "ışık enerjisi", "elektron", "su", "fotoliz"],
    "type": "classical",
    "category": "Alt başlık",
    "explanation": "Bu soruya verilebilecek ideal ve eksiksiz cevap."
  }
]`;
    }

    const systemPrompt = `Sen deneyimli bir öğretmensin. Aşağıdaki metni okuyarak öğrencilerin konuyu anlama seviyelerini ölçecek kaliteli Türkçe sınav soruları oluştur.
İstenen Soru Tipi: ${format}
Zorluk Derecesi: ${difficulty}

${formatPrompt}

Metnin genelini kapsayacak şekilde toplamda 8-10 adet soru/çift oluştur.`;

    const cleanText = limitTextSize(pdfText);
    return await callApi(provider, apiKey, model, systemPrompt, cleanText, true);
  },

  /**
   * Evaluates classical written response.
   */
  async evaluateClassicalAnswer(provider, apiKey, model, question, idealKeywords, explanation, userAnswer) {
    const systemPrompt = `Sen bir öğretmensin. Aşağıdaki açık uçlu soruya öğrencinin verdiği cevabı değerlendir.
Soru: ${question}
Beklenen İdeal Cevap Açıklaması: ${explanation}
Cevapta olması önerilen anahtar kelimeler: ${idealKeywords.join(', ')}

Öğrencinin verdiği yanıtı incele, anahtar kelimelerin varlığını ve kavramsal doğruluğu test et. 
Yanıtını mutlaka şu JSON yapısında döndür:
{
  "score": 8, // 10 üzerinden puan (tamsayı)
  "feedback": "Cevabınız genel olarak doğru ancak klorofil maddesinden bahsetmeyi unutmuşsunuz.",
  "isCorrect": true // Puan 7 ve üzeriyse true, değilse false
}`;

    const userPrompt = `Öğrencinin Yanıtı: "${userAnswer}"`;
    return await callApi(provider, apiKey, model, systemPrompt, userPrompt, true);
  },

  async generateFlashcards(provider, apiKey, model, pdfText) {
    const systemPrompt = `Sen bir eğitim asistanısın. Aşağıdaki ders notundan öğrencilerin ezberlemesi ve tekrar yapması gereken en önemli terim, kavram, soru ve cevapları çıkararak Türkçe bilgi kartları oluştur.
Yanıtını mutlaka şu JSON array formatında döndür:
[
  {
    "question": "Kartın ön yüzü: Soru veya terim",
    "answer": "Kartın arka yüzü: Cevap veya detaylı tanım",
    "category": "Ders konusu"
  }
]
12-15 adet kart oluştur.`;

    const cleanText = limitTextSize(pdfText);
    return await callApi(provider, apiKey, model, systemPrompt, cleanText, true);
  },

  async generateWeaknessReview(provider, apiKey, model, pdfText, weakTopics, wrongQuestions) {
    const systemPrompt = `Sen öğrenme analitiği uzmanısın. Öğrencinin zayıf konularına odaklanan Türkçe düzeltici çalışma kartları oluştur.
Zayıf Konular: ${weakTopics.join(', ')}
Hata Yaptığı Sorular:
${wrongQuestions.map((q, idx) => `${idx + 1}. Soru: ${q.question} -> Öğrenci Yanıtı: ${q.userAnswer} (Doğru: ${q.correctAnswer})`).join('\n')}

Yanıtını mutlaka şu JSON array formatında döndür:
[
  {
    "question": "Zayıf olunan konuyu hedefleyen düzeltici soru/kavram",
    "answer": "Hatanın nedenini açıklayan ve doğrusunu akılda kalıcı şekilde öğreten detaylı cevap",
    "category": "Zayıf olunan konu başlığı"
  }
]
6-8 adet kart oluştur.`;

    const cleanText = limitTextSize(pdfText);
    return await callApi(provider, apiKey, model, systemPrompt, cleanText, true);
  }
};
