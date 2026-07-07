import sys
with open('src/index.css', 'r', encoding='utf-8') as f:
    content = f.read()

import re

new_hero = '''\.teams-hero {
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
}'''

content = re.sub(r'\.teams-hero\s*\{[^}]*\}', new_hero.replace('\\', ''), content, count=1)

new_h1 = '''.teams-hero__content h1 {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 12px;
  color: #fff;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}'''
content = re.sub(r'\.teams-hero__content h1\s*\{[^}]*\}', new_h1, content, count=1)

new_p = '''.teams-hero__content p {
  color: #e2e8f0;
  font-size: 1.15rem;
  margin-bottom: 24px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}'''
content = re.sub(r'\.teams-hero__content p\s*\{[^}]*\}', new_p, content, count=1)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
