import { useEffect, useRef } from 'react';
import { useTheme } from '../hooks/useTheme';

const ParticleBackground = ({ particleCount = 75 }) => {
  const canvasRef = useRef(null);
  const { theme } = useTheme();
  const animationRef = useRef(null);
  const particlesRef = useRef([]);
  const burstsRef = useRef([]);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const handleResize = () => resize();
    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };
    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };
    const handleClick = (e) => {
      // Spawn burst ripples on click
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12;
        const speed = Math.random() * 2 + 1.5;
        burstsRef.current.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: Math.random() * 3 + 2,
          alpha: 1,
          life: 1,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('click', handleClick);

    // Initialize 3D-depth particles
    particlesRef.current = Array.from({ length: particleCount }, () => {
      const z = Math.random() * 3 + 1; // 3D depth layer (1 = near, 3 = far)
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z,
        vx: (Math.random() - 0.5) * (0.6 / z),
        vy: (Math.random() - 0.5) * (0.6 / z),
        radius: (Math.random() * 2.5 + 1) / (z * 0.7),
        baseOpacity: Math.random() * 0.4 + 0.2,
        opacity: Math.random() * 0.4 + 0.2,
        pulseAngle: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.03 + 0.01,
        colorType: Math.random() > 0.3 ? 'primary' : 'accent',
      };
    });

    const getColors = () => {
      if (theme === 'light') {
        return {
          primary: '124, 58, 237',  // violet
          accent: '236, 72, 153',   // pink
          line: '124, 58, 237',
        };
      }
      return {
        primary: '139, 92, 246',   // glowing purple
        accent: '236, 72, 153',    // glowing pink
        line: '139, 92, 246',
      };
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const colors = getColors();
      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      // Update & render click bursts
      burstsRef.current = burstsRef.current.filter((b) => b.alpha > 0.02);
      for (const b of burstsRef.current) {
        b.x += b.vx;
        b.y += b.vy;
        b.alpha *= 0.94;

        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colors.accent}, ${b.alpha})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(${colors.accent}, 0.8)`;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Update & render main particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap edges
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;

        // Pulse opacity
        p.pulseAngle += p.pulseSpeed;
        p.opacity = p.baseOpacity + Math.sin(p.pulseAngle) * 0.15;

        // Mouse interaction (repel gently)
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const mouseDist = 150;

          if (dist < mouseDist) {
            const force = (1 - dist / mouseDist) * 1.5;
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
          }
        }

        // Draw particle with glow
        const rgb = p.colorType === 'primary' ? colors.primary : colors.accent;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${Math.min(1, p.opacity + 0.1)})`;
        ctx.shadowBlur = p.z === 1 ? 12 : 6;
        ctx.shadowColor = `rgba(${rgb}, 0.7)`;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw connecting lines between particles
      const maxDist = 130;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const lineOpacity = (1 - dist / maxDist) * 0.22;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${colors.line}, ${lineOpacity})`;
            ctx.lineWidth = 0.75 / Math.min(p1.z, p2.z);
            ctx.stroke();
          }
        }

        // Connect particles to mouse cursor when close
        if (mouse.active) {
          const p = particles[i];
          const mDx = p.x - mouse.x;
          const mDy = p.y - mouse.y;
          const mDist = Math.sqrt(mDx * mDx + mDy * mDy);
          const mMaxDist = 160;

          if (mDist < mMaxDist) {
            const mLineOpacity = (1 - mDist / mMaxDist) * 0.35;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(${colors.accent}, ${mLineOpacity})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('click', handleClick);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [theme, particleCount]);

  return (
    <canvas
      ref={canvasRef}
      className="particle-bg"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
};

export default ParticleBackground;
