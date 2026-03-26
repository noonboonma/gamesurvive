import React from 'react';

const PlayerHand = ({ cards, socket }) => {
    const useCard = (cardId) => {
        socket.emit('use-card', { cardId });
    };

    return (
        <div className="player-hand">
            <h4>การ์ดในมือ (Secret)</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
                {cards.map(card => (
                    <div
                        key={card.id}
                        className="card"
                        onClick={() => useCard(card.id)}
                        style={{
                            padding: '10px',
                            border: '2px solid #34495e',
                            borderRadius: '8px',
                            backgroundColor: card.type === 'DEFENSE' ? '#f39c12' : '#2ecc71',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        {card.name}
                        <br />
                        <small>{card.description}</small>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PlayerHand;