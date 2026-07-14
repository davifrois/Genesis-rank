const fs = require('fs');
const path = 'src/pages/Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add recharts to imports
if (!content.includes("from 'recharts'")) {
    content = content.replace("import { Link, useLocation, useNavigate } from 'react-router-dom';", 
        "import { Link, useLocation, useNavigate } from 'react-router-dom';\nimport { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';");
}

// 2. Add Sparkles import if not present
if (!content.includes('Sparkles,')) {
    content = content.replace('Users,', 'Sparkles,\n    Users,');
}

fs.writeFileSync(path, content, 'utf8');
console.log("Imports updated.");
