import fs from 'fs';

async function fixRoles() {
    try {
        console.log("Logging in as admin...");
        const loginRes = await fetch('http://localhost:8080/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        if (!loginRes.ok) {
            console.error("Failed to login as admin:", await loginRes.text());
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log("Logged in successfully. Token length:", token.length);

        console.log("Fetching users...");
        const usersRes = await fetch('http://localhost:8080/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!usersRes.ok) {
            console.error("Failed to fetch users:", await usersRes.text());
            return;
        }

        const users = await usersRes.json();
        console.log("Found users:", users.map(u => u.username));

        const usersToFix = ['davifrois', 'simone'];

        for (const username of usersToFix) {
            const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
            if (user) {
                console.log(`Updating ${username}...`);
                const updateRes = await fetch(`http://localhost:8080/api/admin/users/${encodeURIComponent(user.id || user.username)}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({
                        username: user.username,
                        name: user.name || user.username,
                        role: 'ADMIN'
                    })
                });

                if (updateRes.ok) {
                    console.log(`Successfully updated ${username} to ADMIN.`);
                } else {
                    console.error(`Failed to update ${username}:`, await updateRes.text());
                }
            } else {
                console.log(`User ${username} not found. Proceeding...`);
            }
        }
        
    } catch (err) {
        console.error("Error:", err);
    }
}

fixRoles();
