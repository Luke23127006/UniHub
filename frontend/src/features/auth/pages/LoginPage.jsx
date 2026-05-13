import { useMemo, useState, useEffect, useRef } from 'react';
import { Form, Link, redirect, useNavigation } from 'react-router';

const inputClass =
  'w-full rounded-lg border border-unihub-border bg-white px-4 py-3 text-sm text-unihub-text outline-none transition placeholder:text-gray-400 focus:border-unihub-primary focus:ring-4 focus:ring-unihub-primary/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-unihub-gold dark:focus:ring-unihub-gold/10';

export async function action() {
  return redirect('/');
}

function PinkHairCharacter({ mode, emailLength, showPassword, mousePos }) {
  const eyeOffset = useMemo(() => {
    if (mode !== 'email') return { x: 0, y: 0 };
    // Base horizontal offset from email length
    const xBase = Math.max(-10, Math.min(10, emailLength * 2 / 8 - 5));
    return { x: xBase, y: 0 };
  }, [emailLength, mode]);

  // Natural look: combine mouse tracking with mode offset
  const finalEyeOffset = useMemo(() => {
    // If typing email, strictly follow the text length
    if (mode === 'email') {
      return eyeOffset;
    }
    // If idle (not typing), follow the mouse
    if (mode === 'idle') {
      return { 
        x: mousePos.x * 5, 
        y: mousePos.y * 3 
      };
    }
    // Otherwise (password mode), no extra offset needed as eyes are often covered
    return { x: 0, y: 0 };
  }, [mode, eyeOffset, mousePos]);

  const isPassword = mode === 'password';
  const isCovering = isPassword && !showPassword;
  const isPeeking = isPassword && showPassword;

  // Colors
  const hairGrad = 'url(#hairGrad)';
  const skinGrad = 'url(#skinGrad)';

  return (
    <div className="mx-auto h-40 w-40 sm:h-48 sm:w-48 relative">
      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes character-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes sparkle-twinkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes heart-pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.3); opacity: 0.8; }
        }
        @keyframes blink {
          0%, 96%, 100% { transform: scaleY(1); }
          98% { transform: scaleY(0.1); }
        }
        .animate-character { animation: character-float 4s ease-in-out infinite; }
        .animate-sparkle { animation: sparkle-twinkle 3s ease-in-out infinite; }
        .animate-heart { animation: heart-pulse 2.5s ease-in-out infinite; }
        .animate-blink { 
          animation: blink 5s infinite;
          transform-origin: center 122px;
        }
      `}} />

      <svg
        viewBox="0 0 220 220"
        role="img"
        aria-label="Nhân vật nàng thơ tóc hồng"
        className="h-full w-full overflow-visible animate-character"
      >
        
        {/* Defs for Gradients & Luminous Glow Filter */}
        <defs>
          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F9C6D5" />
            <stop offset="100%" stopColor="#EAA3B6" />
          </linearGradient>
          <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFF3ED" />
            <stop offset="100%" stopColor="#FDE8E1" />
          </linearGradient>
          
          {/* Soft Luminous Filter - Adjustable intensity and range */}
          <filter id="character-glow" x="-50%" y="-50%" width="200%" height="200%">
            {/* Range: Adjust stdDeviation (Lower = sharp, Higher = soft/wide) */}
            <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur" />
            
            {/* Intensity: Adjust floodOpacity (0 to 1) */}
            <feFlood floodColor="#FFB6C1" floodOpacity="0.8" result="color" className="dark:flood-color-unihub-gold" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            
            <feMerge>
              {/* Stack 'glow' multiple times to increase brightness */}
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

        </defs>

        {/* Decorative Sparkles & Hearts */}
        <g className="animate-sparkle" style={{ animationDelay: '0s' }}>
          <path d="M30 60 L 32 55 L 37 53 L 32 51 L 30 46 L 28 51 L 23 53 L 28 55 Z" fill="#FFD700" filter="url(#character-glow)" />
        </g>
        <g className="animate-sparkle" style={{ animationDelay: '1.5s' }}>
          <path d="M190 80 L 192 75 L 197 73 L 192 71 L 190 66 L 188 71 L 183 73 L 188 75 Z" fill="#FFD700" filter="url(#character-glow)" />
        </g>
        <g className="animate-heart" style={{ animationDelay: '0.5s' }}>
          <path d="M40 100 C 40 95, 45 90, 50 90 C 55 90, 60 95, 60 100 C 60 110, 50 120, 50 120 C 50 120, 40 110, 40 100" fill="#FF7A90" filter="url(#character-glow)" />
        </g>
        <g className="animate-heart" style={{ animationDelay: '2s' }}>
          <path d="M170 140 C 170 135, 175 130, 180 130 C 185 130, 190 135, 190 140 C 190 150, 180 160, 180 160 C 180 160, 170 150, 170 140" fill="#FF7A90" filter="url(#character-glow)" />
        </g>

        {/* Character Main Body with Glow Filter */}
        <g filter="url(#character-glow)">
          {/* Back Hair - Slightly Narrower */}
          <path d="M65 25 C 40 25, 25 70, 30 140 C 33 190, 40 220, 40 220 L 180 220 C 180 220, 187 190, 190 140 C 195 70, 180 25, 155 25 C 130 15, 90 15, 65 25 Z" fill={hairGrad} stroke="#3A202A" strokeWidth="2" />


        {/* White Shirt Shoulders - Thon Gọn */}
        <path d="M55 175 C 50 190, 45 220, 45 220 L 175 220 C 175 220, 170 190, 165 175 C 135 165, 85 165, 55 175 Z" fill="#FFFFFF" stroke="#3A202A" strokeWidth="2.5" />

        {/* Sailor Collar - Narrower */}
        <path d="M75 165 C 65 180, 60 215, 60 215 L 85 215 L 110 195 L 135 215 L 160 215 C 160 215, 155 180, 145 165 C 135 158, 125 155, 110 165 C 95 155, 85 158, 75 165 Z" fill="#1E3A5F" stroke="#3A202A" strokeWidth="2.5" />

        {/* Collar Stripes */}
        <path d="M68 170 C 60 185, 55 210, 55 210 L 82 210 L 110 188 L 138 210 L 165 210 C 165 210, 160 185, 152 170" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />

        {/* Neck */}
        <path d="M98 145 L 98 165 C 106 170, 114 170, 122 165 L 122 145 Z" fill={skinGrad} stroke="#3A202A" strokeWidth="2" />
        <path d="M98 145 C 106 155, 114 155, 122 145" fill="none" stroke="#D1B3AA" strokeWidth="2.5" />

        {/* Face Shape (Round Anime Style) */}
        <path d="M50 100 C 50 40, 80 30, 110 30 C 140 30, 170 40, 170 100 C 170 145, 140 165, 110 165 C 80 165, 50 145, 50 100 Z" fill={skinGrad} stroke="#3A202A" strokeWidth="2.5" />

        {/* Ribbon - Slimmer */}
        <path d="M95 195 L 85 220 L 110 210 L 135 220 L 125 195 Z" fill="#152842" stroke="#3A202A" strokeWidth="2.5" />
        <circle cx="110" cy="195" r="6" fill="#152842" stroke="#3A202A" strokeWidth="2.5" />

        {/* Blush */}
        <ellipse cx="75" cy="132" rx="12" ry="6" fill="#FFA5B5" opacity="0.6" />
        <ellipse cx="145" cy="132" rx="12" ry="6" fill="#FFA5B5" opacity="0.6" />
        <path d="M70 132 L 75 128 M 75 133 L 80 129 M 80 134 L 85 130" fill="none" stroke="#FF7A90" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <path d="M135 130 L 140 134 M 140 129 L 145 133 M 145 128 L 150 132" fill="none" stroke="#FF7A90" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />

        {/* Eyes & Eyebrows */}
        {!isCovering && (
          <g className={`transition-transform duration-300 ${isPeeking ? 'translate-y-1' : ''}`}>
            {/* Left Eye */}
            <g transform={`translate(${finalEyeOffset.x}, ${finalEyeOffset.y})`}>
              <g className="animate-blink">
                <path d="M60 115 C 70 100, 90 100, 98 115" fill="none" stroke="#251515" strokeWidth="4.5" strokeLinecap="round" />
                <path d="M60 115 C 55 120, 55 125, 58 130" fill="none" stroke="#251515" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M65 95 Q 77 90 90 95" fill="none" stroke="#C47A8A" strokeWidth="2" strokeLinecap="round" />
                <ellipse cx="79" cy="122" rx="14" ry="18" fill="#5F3A2A" />
                <ellipse cx="79" cy="122" rx="8" ry="11" fill="#2A150F" />
                <circle cx="73" cy="112" r="6" fill="#FFF" />
                <circle cx="86" cy="132" r="3" fill="#FFF" opacity="0.8" />
                <path d="M68 128 C 75 140, 88 135, 90 125 C 88 133, 75 135, 68 128 Z" fill="#995E40" opacity="0.8" />
              </g>
            </g>
            {/* Right Eye */}
            <g transform={`translate(${finalEyeOffset.x}, ${finalEyeOffset.y})`}>
              <g className="animate-blink">
                <path d="M160 115 C 150 100, 130 100, 122 115" fill="none" stroke="#251515" strokeWidth="4.5" strokeLinecap="round" />
                <path d="M160 115 C 165 120, 165 125, 162 130" fill="none" stroke="#251515" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M155 95 Q 143 90 130 95" fill="none" stroke="#C47A8A" strokeWidth="2" strokeLinecap="round" />
                <ellipse cx="141" cy="122" rx="14" ry="18" fill="#5F3A2A" />
                <ellipse cx="141" cy="122" rx="8" ry="11" fill="#2A150F" />
                <circle cx="147" cy="112" r="6" fill="#FFF" />
                <circle cx="134" cy="132" r="3" fill="#FFF" opacity="0.8" />
                <path d="M152 128 C 145 140, 132 135, 130 125 C 132 133, 145 135, 152 128 Z" fill="#995E40" opacity="0.8" />
              </g>
            </g>
          </g>
        )}


        {/* Nose & Mouth */}
        <circle cx="110" cy="138" r="1.5" fill="#4A3025" />
        <path d="M106 149 Q 110 152 114 149" fill="none" stroke="#4A3025" strokeWidth="2" strokeLinecap="round" />

        {/* Top Hair Volume */}
        <path d="M60 50 Q 110 15 160 50 C 145 45, 75 45, 60 50 Z" fill={hairGrad} stroke="#3A202A" strokeWidth="2" strokeLinejoin="round" />

        {/* Side Locks - Tucked in closer */}
        <path d="M55 50 C 45 120, 45 180, 50 220 C 55 180, 65 140, 75 110 C 80 80, 70 60, 60 50 Z" fill={hairGrad} stroke="#3A202A" strokeWidth="2" strokeLinejoin="round" />
        <path d="M165 50 C 175 120, 175 180, 170 220 C 165 180, 155 140, 145 110 C 140 80, 150 60, 160 50 Z" fill={hairGrad} stroke="#3A202A" strokeWidth="2" strokeLinejoin="round" />

        {/* Bangs (Sakura-style M shape) */}
        <path d="M110 35 C 100 65, 90 85, 95 105 C 85 90, 75 80, 70 85 C 65 80, 60 70, 55 50 C 70 40, 90 35, 110 35 Z" fill={hairGrad} stroke="#3A202A" strokeWidth="2" strokeLinejoin="round" />
        <path d="M110 35 C 120 65, 130 85, 125 105 C 135 90, 145 80, 150 85 C 155 80, 160 70, 165 50 C 150 40, 130 35, 110 35 Z" fill={hairGrad} stroke="#3A202A" strokeWidth="2" strokeLinejoin="round" />

        {/* Hands & Long Arms */}
        <g className={`transition-transform duration-500 ${isPassword ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <g className={`transition-transform duration-300 ${isPeeking ? 'translate-y-4' : ''}`}>
            {/* Left Arm & Hand */}
            <path d="M35 220 C 40 170, 55 140, 75 140 C 95 140, 95 180, 65 220 Z" fill={skinGrad} stroke="#3A202A" strokeWidth="2.5" strokeLinejoin="round" />
            <ellipse cx="80" cy="130" rx="14" ry="18" fill={skinGrad} stroke="#3A202A" strokeWidth="2.5" />

            {/* Right Arm & Hand */}
            <path d="M185 220 C 180 170, 165 140, 145 140 C 125 140, 125 180, 155 220 Z" fill={skinGrad} stroke="#3A202A" strokeWidth="2.5" strokeLinejoin="round" />
            <ellipse cx="140" cy="130" rx="14" ry="18" fill={skinGrad} stroke="#3A202A" strokeWidth="2.5" />
          </g>
        </g>
        </g>
      </svg>
    </div>

  );
}

export default function LoginPage() {
  const [focusedField, setFocusedField] = useState('idle');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 3;
      
      const dx = (event.clientX - centerX) / (rect.width / 2);
      const dy = (event.clientY - centerY) / (rect.height / 2);
      
      setMousePos({ 
        x: Math.max(-1, Math.min(1, dx)), 
        y: Math.max(-1, Math.min(1, dy)) 
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-[420px]" ref={cardRef}>
        <div className="rounded-2xl border border-unihub-border bg-unihub-card p-5 shadow-xl shadow-unihub-primary/10 dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/30 sm:p-7">
          <PinkHairCharacter
            mode={focusedField}
            emailLength={email.length}
            showPassword={showPassword}
            mousePos={mousePos}
          />

          <div className="mt-2 text-center">
            <h1 className="text-xl font-bold text-unihub-text dark:text-white">Đăng nhập</h1>
            <p className="mt-1 text-[13px] text-unihub-muted dark:text-gray-400">
              Dùng tài khoản trường hoặc SSO để tiếp tục.
            </p>
          </div>

          <Form method="post" className="mt-5 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-unihub-text dark:text-gray-200">
                Email
              </span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField('idle')}
                className={inputClass}
                placeholder="student@university.edu"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-unihub-text dark:text-gray-200">
                Mật khẩu
              </span>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField('idle')}
                  className={`${inputClass} pr-20`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setShowPassword((current) => !current);
                    setFocusedField('password');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-unihub-primary transition hover:bg-unihub-primary/10 dark:text-unihub-gold dark:hover:bg-unihub-gold/10"
                >
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between gap-4 text-xs">
              <label className="flex items-center gap-2 text-unihub-muted dark:text-gray-400">
                <input
                  type="checkbox"
                  name="remember"
                  className="h-3.5 w-3.5 rounded border-unihub-border text-unihub-primary focus:ring-unihub-primary dark:border-gray-700"
                />
                Ghi nhớ
              </label>
              <Link to="/" className="font-semibold text-unihub-primary hover:text-unihub-primary-hover dark:text-unihub-gold">
                Quên mật khẩu
              </Link>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-unihub-primary py-2.5 text-sm font-bold text-white transition hover:bg-unihub-primary-hover disabled:cursor-not-allowed disabled:opacity-70 dark:bg-unihub-gold dark:text-unihub-text dark:hover:bg-yellow-300"
              >
                {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </div>
          </Form>

          <p className="mt-5 text-center text-[11px] leading-4 text-unihub-muted dark:text-gray-500">
            Tài khoản sinh viên được đối chiếu với dữ liệu đồng bộ từ trường.
          </p>
        </div>
      </div>

    </section>
  );
}
