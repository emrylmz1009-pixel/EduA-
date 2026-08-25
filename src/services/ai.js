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
  let retries = 3;
  let delay = 1500;
  
  while (retries > 0) {
    try {
      return await callApiInner(provider, apiKey, model, systemPrompt, userPrompt, isJson, mediaData);
    } catch (err) {
      const isRetryable = err.message.toLowerCase().includes('overloaded') || 
                          err.message.toLowerCase().includes('experiencing high demand') || 
                          err.message.toLowerCase().includes('quota exceeded') ||
                          err.message.toLowerCase().includes('rate limit') ||
                          err.message.includes('503') ||
                          err.message.includes('429');
                          
      if (isRetryable && retries > 1) {
        retries--;
        console.warn(`API call failed (retryable error: ${err.message}). Retrying in ${delay}ms... Remaining retries: ${retries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
      } else {
        throw err;
      }
    }
  }
}

async function callApiInner(provider, apiKey, model, systemPrompt, userPrompt, isJson = true, mediaData = null) {
  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    
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

  } else if (provider === 'claude') {
    const url = 'https://api.anthropic.com/v1/messages';
    
    let contentParts = userPrompt;
    if (mediaData && mediaData.mimeType.startsWith('image/')) {
      contentParts = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaData.mimeType,
            data: mediaData.base64
          }
        },
        {
          type: 'text',
          text: userPrompt
        }
      ];
    } else {
      contentParts = [
        {
          type: 'text',
          text: userPrompt
        }
      ];
    }

    const body = {
      model: model,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: contentParts }
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'dangerously-allow-browser': 'true'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `Sunucu hatası (Kod: ${response.status})`;
      throw new Error(`Claude API Hatası: ${errMsg}`);
    }

    const data = await response.json();
    const generatedText = data.content?.[0]?.text;
    if (!generatedText) {
      throw new Error("Claude API'den boş yanıt döndü.");
    }

    return isJson ? parseJsonResponse(generatedText) : generatedText;

  } else if (['openai', 'deepseek', 'groq', 'grok'].includes(provider)) {
    let url = 'https://api.openai.com/v1/chat/completions';
    
    if (provider === 'deepseek') {
      url = 'https://api.deepseek.com/v1/chat/completions';
    } else if (provider === 'groq') {
      url = 'https://api.groq.com/openai/v1/chat/completions';
    } else if (provider === 'grok') {
      url = 'https://api.x.ai/v1/chat/completions';
    }

    let contentParts = userPrompt;
    
    // Support image multimodal for OpenAI/Grok compatibility
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
      throw new Error(`${provider.toUpperCase()} API Hatası: ${errMsg}`);
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content;
    if (!generatedText) {
      throw new Error(`${provider.toUpperCase()} API'den boş yanıt döndü.`);
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
    if (provider !== 'gemini') {
      throw new Error('Ses dosyası analizi şu anda sadece Google Gemini tarafından desteklenmektedir. Lütfen sağlayıcıyı Google Gemini olarak ayarlayın.');
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
  },

  async solveVisualQuestion(provider, apiKey, model, mimeType, base64Data, subject, promptText) {
    const systemPrompt = `Sen uzman bir branş öğretmenisin. Yüklenen görseldeki soruyu tespit et ve adım adım çözümünü hazırla.
Ders Branşı: ${subject}
Ek Öğrenci İstekleri: "${promptText || 'Yok'}"

Yanıtını MUTLAKA Türkçe olarak ve tam olarak şu JSON şemasında döndür:
{
  "questionText": "Tespit edilen sorunun tam metin hali (varsa formülleriyle)",
  "solutionSteps": [
    "1. Adım: ...",
    "2. Adım: ..."
  ],
  "finalAnswer": "Nihai net cevap (Örn: D şıkkı, 42, vb.)",
  "topicName": "Sorunun ait olduğu spesifik konu başlığı",
  "studyTip": "Bu tarz soruları çözerken öğrencinin aklında tutması gereken ipucu/taktik"
}`;

    const userPrompt = `Görseldeki soruyu analiz et, çöz ve JSON şemasına uygun yanıt ver.`;
    const mediaData = { mimeType, base64: base64Data };
    return await callApi(provider, apiKey, model, systemPrompt, userPrompt, true, mediaData);
  },

  async generateStudyPlan(provider, apiKey, model, goalDescription, targetExam, availableHours, preferredSubjects, grade) {
    const systemPrompt = `Sen profesyonel bir eğitim koçusun. Öğrenci için kişiselleştirilmiş, verimli haftalık çalışma takvimi hazırla.
Öğrencinin Hedefi: ${goalDescription}
Öğrencinin Sınıf Seviyesi: ${grade}
Hedef Sınavı: ${targetExam}
Haftalık Ayırabileceği Toplam Saat: ${availableHours} saat
Çalışmak İstediği Öncelikli Dersler: ${preferredSubjects.join(', ')}

Yanıtını MUTLAKA Türkçe ve tam olarak şu JSON şemasında döndür:
{
  "planTitle": "Haftalık Çalışma Planı Başlığı",
  "weeklySummary": "Haftalık ders çalışma stratejisinin genel açıklaması...",
  "schedule": [
    {
      "day": "Pazartesi",
      "sessions": [
        { 
          "time": "Saat Aralığı (Örn: 17:00 - 18:30)", 
          "subject": "Ders Adı (Örn: Matematik)", 
          "unit": "Dersin Ünite Adı (Örn: Trigonometri)",
          "topic": "Üniteye Ait Çalışılacak Konu (Örn: Trigonometrik Denklemler)", 
          "duration": "Süre (Örn: 90 dk)",
          "tasks": [
            "Konu anlatım videosunu izle ve formülleri not al",
            "Konuyla ilgili 30 test sorusu çöz",
            "Yanlış yaptığın soruların çözümlerini analiz et"
          ]
        }
      ]
    }
  ],
  "recommendations": [
    "Tavsiye 1...",
    "Tavsiye 2..."
  ]
}`;

    const userPrompt = `Öğrenci hedeflerine uygun haftalık çalışma planını JSON şemasında oluştur.`;
    return await callApi(provider, apiKey, model, systemPrompt, userPrompt, true);
  },

  async generateLectureAgenda(provider, apiKey, model, pdfText) {
    const systemPrompt = `Sen profesyonel bir özel öğretmensin. Yüklenen ders notunu incele ve bu ders notunu sesli olarak anlatmak için 3 ile 5 bölümden oluşan mantıksal bir ders müfredatı/akışı (agenda) oluştur.
Her bölümün adı kısa ve açıklayıcı olsun.
Yanıtını MUTLAKA Türkçe ve tam olarak şu JSON şemasında döndür:
{
  "agendaTitle": "Dersin Genel Başlığı",
  "sections": [
    { "title": "Bölüm Başlığı (Örn: 1. Limit Kavramı)", "description": "Bu bölümde işlenecek temel kavramlar..." }
  ]
}`;
    const userPrompt = `Aşağıdaki ders içeriği için ders akışı oluştur.`;
    const cleanText = limitTextSize(pdfText);
    return await callApi(provider, apiKey, model, systemPrompt, `${userPrompt}\n\nDers İçeriği:\n${cleanText}`, true);
  },

  async explainLectureSegment(provider, apiKey, model, pdfText, agendaTitle, sectionTitle, sectionDescription, history) {
    const systemPrompt = `Sen samimi ve başarılı bir özel öğretmensin. Ders başlığı: ${agendaTitle}. 
Şu an anlatman gereken bölüm: "${sectionTitle}" (${sectionDescription}).
Metni oku ve bu bölümü öğrenciye sesli anlatacakmışsın gibi samimi, öğretici, akıcı bir öğretmen tonuyla anlat. Anlatım çok uzun olmasın (ortalama 2-3 paragraf), net ve anlaşılır olsun.
Anlatımın sonunda öğrenciye bu anlattığın yerle ilgili aklına takılan bir soru olup olmadığını sor.
Yanıtını doğrudan düz metin olarak döndür.`;
    const userPrompt = `Ders içeriğine dayanarak "${sectionTitle}" bölümünü öğrenciye anlat.`;
    const cleanText = limitTextSize(pdfText);
    return await callApi(provider, apiKey, model, systemPrompt, `${userPrompt}\n\nDers İçeriği:\n${cleanText}\n\nÖnceki Sohbet Geçmişi:\n${JSON.stringify(history)}`, false);
  },

  async answerLectureQuestion(provider, apiKey, model, pdfText, sectionTitle, question, history) {
    const systemPrompt = `Sen samimi bir özel öğretmensin. Öğrenci "${sectionTitle}" bölümü anlatılırken araya girdi ve sana bir soru sordu.
Öğrencinin Sorusu: "${question}"
Ders içeriğine ve bağlama sadık kalarak, öğrencinin bu sorusunu açıklayıcı, net ve samimi bir öğretmen tonuyla cevapla.
Cevabını doğrudan düz metin olarak döndür.`;
    const cleanText = limitTextSize(pdfText);
    return await callApi(provider, apiKey, model, systemPrompt, `Soru: ${question}\n\nDers İçeriği:\n${cleanText}\n\nSohbet Geçmişi:\n${JSON.stringify(history)}`, false);
  },

  async getTargetSchoolNets(provider, apiKey, model, schoolName, examType) {
    const systemPrompt = `Sen eğitim danışmanlığı uzmanısın. Öğrencinin seçtiği hedef okulun (LGS veya YKS için) en güncel yaklaşık taban puanı ve kazanması için her testten yapması gereken ortalama net sayılarını hesapla.
Hedef Okul: ${schoolName}
Sınav Türü: ${examType}

Yanıtını MUTLAKA Türkçe ve tam olarak şu JSON şemasında döndür:
{
  "schoolName": "Okulun Tam Resmi Adı",
  "estimatedCutoff": "Tahmini Taban Puan (Örn: LGS için 475.2, YKS için TYT: 510.5 vb.)",
  "targetNets": {
    "turkce": 18,
    "matematik": 17,
    "fen": 18,
    "sosyal": 9
  },
  "tutorAdvice": "Bu okula yerleşmek için ders çalışma stratejisi tavsiyesi..."
}`;
    const userPrompt = `${schoolName} (${examType}) için tahmini taban puanı ve ortalama net gereksinimlerini oluştur.`;
    return await callApi(provider, apiKey, model, systemPrompt, userPrompt, true);
  },

  async structureVoiceNote(provider, apiKey, model, rawText) {
    const systemPrompt = `Sen profesyonel bir ders çalışma asistanısın. Öğrencinin konuşarak aldığı düzensiz ders çalışma notunu / konuşma dökümünü düzenle.
İçeriği anlaşılır, başlıklandırılmış, maddeler halinde temiz bir Markdown çalışma notu haline getir.
İçeriğe uygun kısa bir başlık belirle.
Yanıtını MUTLAKA Türkçe ve tam olarak şu JSON şemasında döndür:
{
  "title": "Notun Başlığı",
  "subject": "Dersin Adı (Örn: Matematik, Fizik, Genel)",
  "formattedNote": "Markdown formatında düzenlenmiş, maddeli ders notu içeriği..."
}`;
    const userPrompt = `Aşağıdaki ses dökümünü şık bir ders notuna dönüştür:\n\n${rawText}`;
    return await callApi(provider, apiKey, model, systemPrompt, userPrompt, true);
  },

  async generateOralQuestion(provider, apiKey, model, subject, pdfText, questionIndex, history) {
    const systemPrompt = `Sen samimi ve uzman bir sözlü sınav öğretmenisin. Öğrenciye "${subject}" konusuyla ilgili sözlü sınav yapıyorsun.
Soru Sırası: ${questionIndex}. Soru.
Eğer döküman metni sağlanmışsa, soruyu doğrudan ders notundaki bilgilere dayandır.
Soru açık uçlu, öğrencinin bilgisini anlatarak açıklamaya zorlayacak kalitede bir soru olsun.
Yanıtını MUTLAKA Türkçe ve tam olarak şu JSON şemasında döndür:
{
  "questionText": "Öğrenciye sesli sorulacak olan açık uçlu sözlü sınav sorusunun metni"
}`;
    const cleanText = pdfText ? limitTextSize(pdfText) : '';
    const userPrompt = `Ders: ${subject}\nSoru Sırası: ${questionIndex}\n\nDers İçeriği:\n${cleanText}\n\nSohbet Geçmişi:\n${JSON.stringify(history)}`;
    return await callApi(provider, apiKey, model, systemPrompt, userPrompt, true);
  },

  async evaluateOralAnswer(provider, apiKey, model, question, studentAnswer, pdfText) {
    const systemPrompt = `Sen uzman bir sözlü sınav öğretmenisin. Öğrencinin sözlü sınav sorusuna verdiği cevabı puanla ve yapıcı geri bildirim ver.
Sözlü Sınav Sorusu: "${question}"
Öğrencinin Verdiği Cevap: "${studentAnswer}"

Verilen ders içeriğine dayanarak öğrencinin cevabını objektif olarak değerlendir.
Cevapta doğru söylenen şeyleri tebrik et, eksik bırakılan veya yanlış söylenen anahtar terimleri belirt.
Puanlamayı 0 ile 100 arasında yap.
Yanıtını MUTLAKA Türkçe ve tam olarak şu JSON şemasında döndür:
{
  "score": 85,
  "feedbackText": "Öğrenciye seslendirilecek olan yapıcı geri bildirim ve değerlendirme açıklaması..."
}`;
    const cleanText = pdfText ? limitTextSize(pdfText) : '';
    const userPrompt = `Soru: "${question}"\nCevap: "${studentAnswer}"\n\nDers İçeriği:\n${cleanText}`;
    return await callApi(provider, apiKey, model, systemPrompt, userPrompt, true);
  },

  async generateSchoolExam(provider, apiKey, model, grade, subject, term) {
    const systemPrompt = `Sen Türkiye Cumhuriyeti MEB müfredatına hakim uzman bir branş öğretmenisin. Öğrencinin seçtiği sınıf ve sınav dönemine uygun, MEB standartlarında klasik (açık uçlu) yazılı sınav kağıdı hazırla.
Sınıf Düzeyi: ${grade}
Ders Branşı: ${subject}
Sınav Dönemi: ${term}

Yanıtını MUTLAKA Türkçe ve tam olarak şu JSON şemasında döndür:
{
  "examTitle": "Örn: 10. Sınıf Fizik Dersi 1. Dönem 1. Yazılı Sınavı",
  "questions": [
    "1. Klasik (açık uçlu) soru metni...",
    "2. Klasik (açık uçlu) soru metni...",
    "3. Klasik (açık uçlu) soru metni...",
    "4. Klasik (açık uçlu) soru metni...",
    "5. Klasik (açık uçlu) soru metni..."
  ]
}`;
    const userPrompt = `${grade} ${subject} ${term} klasik yazılı sınavını oluştur.`;
    return await callApi(provider, apiKey, model, systemPrompt, userPrompt, true);
  },

  async gradeSchoolExamAnswers(provider, apiKey, model, questions, studentAnswers) {
    const systemPrompt = `Sen titiz ve yapıcı bir okul öğretmenisin. Öğrencinin klasik yazılı sınav sorularına verdiği cevapları MEB kriterlerine göre oku ve puanla.
Sınav Soruları:
${questions.map((q, idx) => `${idx + 1}. Soru: ${q}`).join('\n')}

Öğrencinin Verdiği Cevaplar:
${studentAnswers.map((a, idx) => `${idx + 1}. Soru Cevabı: ${a}`).join('\n')}

Her soruyu ayrı ayrı 20 puan üzerinden değerlendir (toplam 100 puan).
Her soru için kazanılan puanı ve kısa öğretmen notunu/düzeltmesini içeren bir karne hazırla.
Yanıtını MUTLAKA Türkçe ve tam olarak şu JSON şemasında döndür:
{
  "totalGrade": 85,
  "teacherAdvice": "Öğrenciye genel çalışma ve eksik kapatma tavsiyesi...",
  "grades": [
    { "score": 15, "comment": "Doğru yaklaşım ancak formül işlem hatası yapılmış. (-5 puan)" }
  ]
}`;
    const userPrompt = `Sınav cevap kağıdını oku, değerlendir ve JSON şemasında notlandır.`;
    return await callApi(provider, apiKey, model, systemPrompt, userPrompt, true);
  },

  async writeTextbookBooklet(provider, apiKey, model, topic) {
    const systemPrompt = `Sen tecrübeli bir ders kitabı yazarı ve öğretmenisin. Öğrencinin yazdığı konu hakkında son derece açıklayıcı, akademik olarak doğru, zengin içerikli bir ders konu anlatım fasikülü/kitapçığı yaz.
Konu Başlığı: ${topic}

İçerikte şunlar yer almalı:
1. Konunun Detaylı Teorik Açıklaması (Tanımlar, Kurallar).
2. Temel Formüller ve Önemli Kurallar (Varsa LaTeX formatında yazılmış denklemler, örn: \\\\(E = mc^2\\\\)).
3. Çözümlü 3 Adet Örnek Soru ve Adım Adım Detaylı Çözümleri.
4. Konuyu Pekiştirmek için 3 Adet Alıştırma Sorusu (Cevap anahtarlı).

Yanıtını MUTLAKA Türkçe ve tam olarak şu JSON şemasında döndür:
{
  "title": "Fasikül Başlığı (Örn: Matematik - Logaritma Kuralları ve Çözümlü Sorular)",
  "subject": "Ders Adı",
  "introduction": "Konuya kısa giriş ve önemi...",
  "theoryContent": "Detaylı konu anlatımı (Markdown formatında, alt başlıklar, tanımlar, maddeler ile)...",
  "formulas": [
    { "formula": "LaTeX formatında formül (Örn: \\\\log_a(x \\\\cdot y) = \\\\log_a x + \\\\log_a y)", "explanation": "Formülün açıklaması..." }
  ],
  "solvedQuestions": [
    { "question": "Soru metni...", "solution": "Detaylı adım adım çözümü..." }
  ],
  "practiceQuestions": [
    { "question": "Alıştırma soru metni...", "answerKey": "Kısa cevap anahtarı..." }
  ]
}`;
    const userPrompt = `"${topic}" konusu için kapsamlı ders anlatım kitapçığını oluştur.`;
    return await callApi(provider, apiKey, model, systemPrompt, userPrompt, true);
  },

  async evaluateOralAnswer(provider, apiKey, model, question, studentAnswer, pdfText) {
    const systemPrompt = `Sen uzman bir sözlü sınav öğretmenisin. Öğrencinin sözlü sınav sorusuna verdiği cevabı puanla ve yapıcı geri bildirim ver.
Sözlü Sınav Sorusu: "${question}"
Öğrencinin Verdiği Cevap: "${studentAnswer}"

Verilen ders içeriğine dayanarak öğrencinin cevabını objektif olarak değerlendir.
Cevapta doğru söylenen şeyleri tebrik et, eksik bırakılan veya yanlış söylenen anahtar terimleri belirt.
Puanlamayı 0 ile 100 arasında yap.
Yanıtını MUTLAKA Türkçe ve tam olarak şu JSON şemasında döndür:
{
  "score": 85,
  "feedbackText": "Öğrenciye seslendirilecek olan yapıcı geri bildirim ve değerlendirme açıklaması..."
}`;
    const cleanText = pdfText ? limitTextSize(pdfText) : '';
    const userPrompt = `Soru: "${question}"\nCevap: "${studentAnswer}"\n\nDers İçeriği:\n${cleanText}`;
    return await callApi(provider, apiKey, model, systemPrompt, userPrompt, true);
  }
};
