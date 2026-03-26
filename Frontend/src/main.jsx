import React from 'react'
import ReactDom from 'react-dom/client'
import App from './App.jsx'
import './index.css' // ถ้าไม่มีไฟล์นี้ให้ลบชื่อบรรทัดนี้ออก

ReactDom.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)