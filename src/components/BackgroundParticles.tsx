import React from 'react';
import Particles from 'react-tsparticles';
import { loadFull } from 'tsparticles';

const BackgroundParticles: React.FC = () => {
  const particlesInit = async (main: any) => {
    await loadFull(main);
  };

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={{
        fullScreen: {
          enable: true,
          zIndex: -1, // Push behind your UI
        },
        background: {
          color: {
            value: 'transparent', // Let gradient show through
          },
        },
        particles: {
          number: {
            value: 60,
            density: {
              enable: true,
              value_area: 800,
            },
          },
          color: { value: '#6366f1' },
          shape: { type: 'circle' },
          opacity: {
            value: 0.2,
            random: true,
          },
          size: {
            value: 3,
            random: true,
          },
          move: {
            enable: true,
            speed: 1,
            direction: 'none',
            outModes: { default: 'out' },
          },
        },
        interactivity: {
          events: {
            onHover: { enable: true, mode: 'repulse' },
            resize: true,
          },
          modes: {
            repulse: {
              distance: 80,
              duration: 0.4,
            },
          },
        },
      }}
    />
  );
};

export default BackgroundParticles;
