// src/components/Login.jsx
import React, { useState } from 'react';
import Swal from 'sweetalert2';

const Login = ({ onLoginSuccess }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [formData, setFormData] = useState({ id: '', password: '', name: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const endpoint = isRegister ? '/api/register' : '/api/login';

        try {
            const response = await fetch(`http://localhost:3000${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (data.success) {
                if (isRegister) {
                    Swal.fire({ title: 'สำเร็จ', text: 'สมัครสมาชิกสำเร็จ! กรุณา Login', icon: 'success' });
                    setIsRegister(false);
                } else {
                    onLoginSuccess(data.name);
                }
            } else {
                Swal.fire({ title: 'เกิดข้อผิดพลาด', text: data.message, icon: 'error' });
            }
        } catch (err) {
            Swal.fire({ title: 'ข้อผิดพลาดระบบ', text: 'เชื่อมต่อ Server ไม่ได้', icon: 'error' });
        }
    };

    return (
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '10px', width: '300px', margin: '100px auto' }}>
            <h2>{isRegister ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input placeholder="ID" onChange={e => setFormData({ ...formData, id: e.target.value })} required />
                <input type="password" placeholder="Password" onChange={e => setFormData({ ...formData, password: e.target.value })} required />
                {isRegister && <input placeholder="ชื่อของคุณ" onChange={e => setFormData({ ...formData, name: e.target.value })} required />}
                <button type="submit" style={{ cursor: 'pointer', padding: '10px' }}>
                    {isRegister ? 'ยืนยันสมัครสมาชิก' : 'Login'}
                </button>
            </form>
            <p onClick={() => setIsRegister(!isRegister)} style={{ cursor: 'pointer', fontSize: '12px', marginTop: '10px' }}>
                {isRegister ? 'มีบัญชีอยู่แล้ว? Login ที่นี่' : 'ยังไม่มีบัญชี? สมัครที่นี่'}
            </p>
        </div>
    );
};

export default Login;