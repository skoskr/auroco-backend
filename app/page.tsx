// app/page.tsx - CMS için yeni homepage
import { prisma } from "@/lib/prisma";

// Server component - içeriği database'den al
async function getPageContent() {
  try {
    const contents = await prisma.content.findMany({
      where: {
        locale: 'tr',
        isActive: true,
        key: {
          startsWith: 'homepage_'
        }
      }
    });

    // İçeriği key'e göre organize et
    const contentMap: Record<string, string> = {};
    contents.forEach(content => {
      const key = content.key.replace('homepage_', '');
      contentMap[key] = content.content;
    });

    return contentMap;
  } catch (error) {
    console.error('Content fetch error:', error);
    return {};
  }
}

export default async function HomePage() {
  const content = await getPageContent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* 3D World Background - Buraya 3D component gelecek */}
        <div className="absolute inset-0 bg-black bg-opacity-40 z-10"></div>
        
        {/* Hero Content */}
        <div className="relative z-20 text-center text-white px-4">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            {content.hero_title || "Auroco"}
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto text-gray-200">
            {content.hero_subtitle || "Teknoloji ve İnovasyon Danışmanlığı"}
          </p>
          <div className="space-x-4">
            <a 
              href="#services" 
              className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg text-white font-semibold transition-colors"
            >
              Hizmetlerimizi Keşfedin
            </a>
            <a 
              href="#contact" 
              className="border-2 border-white hover:bg-white hover:text-gray-900 px-8 py-3 rounded-lg text-white font-semibold transition-all"
            >
              İletişim
            </a>
          </div>
        </div>

        {/* 3D World Container */}
        <div id="3d-world" className="absolute inset-0">
          {/* Bu alan 3D world component'i için rezerve */}
          <div className="w-full h-full bg-gradient-to-b from-transparent to-black/20 flex items-center justify-center">
            <div className="text-white/50 text-lg">3D World Loading...</div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section id="services" className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">
            {content.services_title || "Hizmet Alanlarımız"}
          </h2>
          <p className="text-xl text-center mb-16 text-gray-600">
            {content.services_subtitle || "Dijital dönüşümünüzde size rehberlik ediyoruz"}
          </p>

          {/* Service Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Akademi */}
            <div className="group bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl hover:shadow-xl transition-all cursor-pointer">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-white font-bold">A</span>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Akademi</h3>
              <p className="text-gray-600 mb-4">Eğitim ve geliştirme programları</p>
              <div className="text-sm text-blue-600 font-medium">2 bina modeli →</div>
            </div>

            {/* Deneyim */}
            <div className="group bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl hover:shadow-xl transition-all cursor-pointer">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-white font-bold">D</span>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Deneyim</h3>
              <p className="text-gray-600 mb-4">Kullanıcı deneyimi ve etkinlik yönetimi</p>
              <div className="text-sm text-green-600 font-medium">4 bina modeli →</div>
            </div>

            {/* Otomasyon */}
            <div className="group bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl hover:shadow-xl transition-all cursor-pointer">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-white font-bold">O</span>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Otomasyon</h3>
              <p className="text-gray-600 mb-4">Süreç otomasyonu ve optimizasyon</p>
              <div className="text-sm text-purple-600 font-medium">1 bina modeli →</div>
            </div>

            {/* Strateji */}
            <div className="group bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl hover:shadow-xl transition-all cursor-pointer">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-white font-bold">S</span>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Strateji</h3>
              <p className="text-gray-600 mb-4">İş stratejisi ve danışmanlık</p>
              <div className="text-sm text-orange-600 font-medium">2 bina modeli →</div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6 text-gray-900">
            {content.about_title || "Hakkımızda"}
          </h2>
          <div className="text-lg text-gray-600 leading-relaxed">
            {content.about_content ? (
              <div dangerouslySetInnerHTML={{ __html: content.about_content }} />
            ) : (
              <p>
                Auroco olarak, işletmelerin dijital dönüşüm yolculuğunda 
                güvenilir ortağıyız. Teknoloji ve inovasyonu birleştirerek, 
                müşterilerimizin hedeflerine ulaşmalarını sağlıyoruz.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            {content.contact_title || "İletişime Geçin"}
          </h2>
          <p className="text-xl mb-12 text-gray-300">
            {content.contact_subtitle || "Projeleriniz için birlikte çalışalım"}
          </p>
          
          {/* Contact Form - Bu alan frontend ekibi tarafından doldurulacak */}
          <div className="max-w-md mx-auto">
            <div className="bg-gray-800 p-8 rounded-xl">
              <div className="text-gray-400 mb-4">
                İletişim formu buraya gelecek
              </div>
              <div className="text-sm text-gray-500">
                (Frontend ekibi tarafından implement edilecek)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-black text-white">
        <div className="max-w-6xl mx-auto text-center">
          <div className="text-2xl font-bold mb-4">Auroco</div>
          <div className="text-gray-400 mb-8">
            {content.footer_text || "Teknoloji ve İnovasyon Danışmanlığı"}
          </div>
          <div className="text-sm text-gray-500">
            © 2025 Auroco. Tüm hakları saklıdır.
          </div>
        </div>
      </footer>
    </div>
  );
}