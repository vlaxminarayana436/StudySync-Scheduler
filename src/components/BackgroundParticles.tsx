import React from 'react';

const BackgroundParticles: React.FC = () => (
  <div className="background-particles" aria-hidden="true">
    {Array.from({ length: 12 }, (_, index) => (
      <span key={index} style={{ left: `${(index * 29 + 7) % 100}%`, top: `${(index * 43 + 9) % 100}%` }} />
    ))}
  </div>
);

export default BackgroundParticles;
