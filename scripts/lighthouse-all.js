const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test edilecek sayfalar
const pages = [
  { url: '/', name: 'Home' },
  { url: '/sign-in', name: 'SignIn' },
  { url: '/sign-up', name: 'SignUp' },
  { url: '/dashboard', name: 'Dashboard', requiresAuth: true },
  { url: '/dashboard/analytics', name: 'Analytics', requiresAuth: true },
  { url: '/dashboard/clients', name: 'Clients', requiresAuth: true },
  { url: '/dashboard/listings', name: 'Listings', requiresAuth: true },
  { url: '/dashboard/viewings', name: 'Viewings', requiresAuth: true },
  { url: '/dashboard/revenue', name: 'Revenue', requiresAuth: true },
  { url: '/dashboard/profile', name: 'Profile', requiresAuth: true },
  { url: '/dashboard/subscription', name: 'Subscription', requiresAuth: true },
];

const baseUrl = 'http://localhost:3000';
const reportsDir = path.join(__dirname, '../lighthouse-reports');

// Reports klasörünü oluştur
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

console.log('🚀 Starting Lighthouse tests for all pages...\n');
console.log('⚠️  Note: Auth-required pages will be tested without login (may show different results)\n');

const results = [];

pages.forEach(({ url, name, requiresAuth }) => {
  const fullUrl = `${baseUrl}${url}`;
  const outputPath = path.join(reportsDir, `${name}.json`);
  
  console.log(`📊 Testing: ${name} (${fullUrl})${requiresAuth ? ' [Auth Required]' : ''}`);
  
  try {
    execSync(
      `npx lighthouse "${fullUrl}" --output=json --output-path="${outputPath}" --only-categories=performance,accessibility,best-practices,seo --chrome-flags="--no-sandbox --disable-setuid-sandbox" --quiet`,
      { stdio: 'pipe' }
    );
    
    // Sonuçları oku
    const report = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    const scores = report.categories;
    
    const result = {
      name,
      url,
      performance: Math.round(scores.performance.score * 100),
      accessibility: Math.round(scores.accessibility.score * 100),
      bestPractices: Math.round(scores['best-practices'].score * 100),
      seo: Math.round(scores.seo.score * 100),
      requiresAuth,
    };
    
    results.push(result);
    
    console.log(`✅ ${name}:`);
    console.log(`   Performance: ${result.performance}`);
    console.log(`   Accessibility: ${result.accessibility}`);
    console.log(`   Best Practices: ${result.bestPractices}`);
    console.log(`   SEO: ${result.seo}\n`);
  } catch (error) {
    console.error(`❌ Error testing ${name}:`, error.message);
    results.push({
      name,
      url,
      error: error.message,
      requiresAuth,
    });
  }
});

// Özet rapor oluştur
console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY REPORT');
console.log('='.repeat(60) + '\n');

console.table(results.filter(r => !r.error).map(r => ({
  Page: r.name,
  Perf: r.performance,
  A11y: r.accessibility,
  BP: r.bestPractices,
  SEO: r.seo,
  Auth: r.requiresAuth ? '🔒' : '🔓',
})));

// Ortalama skorları hesapla
const validResults = results.filter(r => !r.error);
if (validResults.length > 0) {
  const avgPerf = Math.round(validResults.reduce((sum, r) => sum + r.performance, 0) / validResults.length);
  const avgA11y = Math.round(validResults.reduce((sum, r) => sum + r.accessibility, 0) / validResults.length);
  const avgBP = Math.round(validResults.reduce((sum, r) => sum + r.bestPractices, 0) / validResults.length);
  const avgSEO = Math.round(validResults.reduce((sum, r) => sum + r.seo, 0) / validResults.length);
  
  console.log('\n📈 Average Scores:');
  console.log(`   Performance: ${avgPerf}`);
  console.log(`   Accessibility: ${avgA11y}`);
  console.log(`   Best Practices: ${avgBP}`);
  console.log(`   SEO: ${avgSEO}`);
}

// Sorunlu sayfalar
const errorPages = results.filter(r => r.error);
if (errorPages.length > 0) {
  console.log('\n❌ Failed Pages:');
  errorPages.forEach(r => console.log(`   - ${r.name}: ${r.error}`));
}

console.log('\n✨ All tests completed! Reports saved to lighthouse-reports/');

// Sonuçları JSON olarak kaydet
const summaryPath = path.join(reportsDir, 'summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
console.log(`📄 Summary report: ${summaryPath}`);
