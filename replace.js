const fs = require('fs');
let content = fs.readFileSync('src/index.css', 'utf-8');

const newHero = .teams-hero {
  background-image: linear-gradient(to bottom, rgba(15, 23, 42, 0.4), rgba(15, 23, 42, 0.95)), url('/assets/images/academy_hero_bg.png');
  background-size: cover;
  background-position: center 30%;
  padding: 80px 0 60px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 40px;
  width: 100vw;
  position: relative;
  left: 50%;
  right: 50%;
  margin-left: -50vw;
  margin-right: -50vw;
};

content = content.replace(/\.teams-hero\s*\{[^}]*\}/, newHero);

const newH1 = .teams-hero__content h1 {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 12px;
  color: #fff;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
};
content = content.replace(/\.teams-hero__content h1\s*\{[^}]*\}/, newH1);

const newP = .teams-hero__content p {
  color: #e2e8f0;
  font-size: 1.15rem;
  margin-bottom: 24px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
};
content = content.replace(/\.teams-hero__content p\s*\{[^}]*\}/, newP);

fs.writeFileSync('src/index.css', content, 'utf-8');
console.log('Done!');
