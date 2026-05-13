import { useMemo, useState } from 'react';
import { Form, Link, redirect, useNavigation } from 'react-router';

const inputClass =
  'w-full rounded-lg border border-unihub-border bg-white px-4 py-3 text-sm text-unihub-text outline-none transition placeholder:text-gray-400 focus:border-unihub-primary focus:ring-4 focus:ring-unihub-primary/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-unihub-gold dark:focus:ring-unihub-gold/10';

export async function action() {
  return redirect('/');
}

function PinkHairCharacter({ mode, emailLength, showPassword }) {
  const eyeOffset = useMemo(() => {
    if (mode !== 'email') return 0;
    return Math.max(-2, Math.min(2, emailLength / 8 - 1));
  }, [emailLength, mode]);

  const isPassword = mode === 'password';
  const isCovering = isPassword && !showPassword;
  const isPeeking = isPassword && showPassword;

  // Colors
  const hairColor = '#F9C5D5'; // Soft pink
  const hairShadow = '#EFA4B5';
  const skinColor = '#FFF1EB'; // Softer cream
  const strokeColor = '#4A3121'; // Soft brown stroke instead of black
  const eyeColor = '#63422E';

  return (
    <div className="mx-auto h-48 w-48 sm:h-56 sm:w-56">
      <svg
        viewBox="0 0 220 220"
        role="img"
        aria-label="Nhân vật nàng thơ tóc hồng"
        className="h-full w-full overflow-visible"
      >
        {/* Background Circle */}
        <circle cx="110" cy="110" r="95" className="fill-[#FDF2F2] dark:fill-gray-800" />
        
        {/* Defs for Gradients */}
        <defs>
          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F9C6D5" />
            <stop offset="100%" stopColor="#EAA3B6" />
          </linearGradient>
          <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFF3ED" />
            <stop offset="100%" stopColor="#FDE8E1" />
          </linearGradient>
        </defs>

        {/* Back Hair */}
        <path d="M60 20 C 30 20, 10 70, 15 140 C 18 190, 25 220, 25 220 L 195 220 C 195 220, 202 190, 205 140 C 210 70, 190 20, 160 20 C 130 10, 90 10, 60 20 Z" fill="url(#hairGrad)" stroke="#3A202A" strokeWidth="2.5" />
        
        {/* White Shirt Shoulders */}
        <path d="M40 175 C 30 190, 20 220, 20 220 L 200 220 C 200 220, 190 190, 180 175 C 145 155, 75 155, 40 175 Z" fill="#FFFFFF" stroke="#3A202A" strokeWidth="2.5" />
        
        {/* Sailor Collar */}
        <path d="M65 160 C 50 180, 40 215, 40 215 L 80 215 L 110 190 L 140 215 L 180 215 C 180 215, 170 180, 155 160 C 140 155, 125 150, 110 160 C 95 150, 80 155, 65 160 Z" fill="#1E3A5F" stroke="#3A202A" strokeWidth="2.5" />
        
        {/* Collar Stripes */}
        <path d="M56 165 C 45 185, 38 210, 38 210 L 75 210 L 110 185 L 145 210 L 182 210 C 182 210, 175 185, 164 165" fill="none" stroke="#FFFFFF" strokeWidth="2" />
        
        {/* Neck */}
        <path d="M95 145 L 95 165 C 105 170, 115 170, 125 165 L 125 145 Z" fill="url(#skinGrad)" stroke="#3A202A" strokeWidth="2" />
        <path d="M95 145 C 105 155, 115 155, 125 145" fill="none" stroke="#D1B3AA" strokeWidth="3" />
        
        {/* Face Shape (Round Anime Style) */}
        <path d="M50 100 C 50 40, 80 30, 110 30 C 140 30, 170 40, 170 100 C 170 145, 140 165, 110 165 C 80 165, 50 145, 50 100 Z" fill="url(#skinGrad)" stroke="#3A202A" strokeWidth="2.5" />
        
        {/* Ribbon */}
        <path d="M90 190 L 75 220 L 110 205 L 145 220 L 130 190 Z" fill="#152842" stroke="#3A202A" strokeWidth="2.5" />
        <circle cx="110" cy="190" r="7" fill="#152842" stroke="#3A202A" strokeWidth="2.5" />

        {/* Blush */}
        <ellipse cx="75" cy="132" rx="12" ry="6" fill="#FFA5B5" opacity="0.6" />
        <ellipse cx="145" cy="132" rx="12" ry="6" fill="#FFA5B5" opacity="0.6" />
        <path d="M70 132 L 75 128 M 75 133 L 80 129 M 80 134 L 85 130" fill="none" stroke="#FF7A90" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <path d="M135 130 L 140 134 M 140 129 L 145 133 M 145 128 L 150 132" fill="none" stroke="#FF7A90" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />

        {/* Eyes & Eyebrows */}
        {!isCovering && (
          <g className={`transition-transform duration-300 ${isPeeking ? 'translate-y-1' : ''}`}>
            {/* Left Eye */}
            <g transform={`translate(${eyeOffset}, 0)`}>
              <path d="M60 115 C 70 100, 90 100, 98 115" fill="none" stroke="#251515" strokeWidth="4.5" strokeLinecap="round" />
              <path d="M60 115 C 55 120, 55 125, 58 130" fill="none" stroke="#251515" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M65 95 Q 77 90 90 95" fill="none" stroke="#C47A8A" strokeWidth="2" strokeLinecap="round" />
              <ellipse cx="79" cy="122" rx="14" ry="18" fill="#5F3A2A" />
              <ellipse cx="79" cy="122" rx="8" ry="11" fill="#2A150F" />
              <circle cx="73" cy="112" r="6" fill="#FFF" />
              <circle cx="86" cy="132" r="3" fill="#FFF" opacity="0.8" />
              <path d="M68 128 C 75 140, 88 135, 90 125 C 88 133, 75 135, 68 128 Z" fill="#995E40" opacity="0.8" />
            </g>
            {/* Right Eye */}
            <g transform={`translate(${eyeOffset}, 0)`}>
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
        )}

        {/* Nose & Mouth */}
        <circle cx="110" cy="138" r="1" fill="#4A3025" />
        {/* Nose & Mouth */}
        <circle cx="110" cy="138" r="1" fill="#4A3025" />
        <path d="M106 149 Q 110 152 114 149" fill="none" stroke="#4A3025" strokeWidth="2" strokeLinecap="round" />

        {/* Top Hair Volume (smooth hairline for tall forehead) */}
        <path d="M60 50 Q 110 15 160 50 C 145 45, 75 45, 60 50 Z" fill="url(#hairGrad)" stroke="#3A202A" strokeWidth="2" strokeLinejoin="round" />

        {/* Side Locks */}
        <path d="M55 50 C 40 120, 40 180, 45 220 C 55 180, 65 140, 75 110 C 80 80, 70 60, 60 50 Z" fill="url(#hairGrad)" stroke="#3A202A" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M165 50 C 180 120, 180 180, 175 220 C 165 180, 155 140, 145 110 C 140 80, 150 60, 160 50 Z" fill="url(#hairGrad)" stroke="#3A202A" strokeWidth="2.5" strokeLinejoin="round" />

        {/* Bangs (Sakura-style M shape) */}
        {/* Left Bang */}
        <path d="M110 35 C 100 65, 90 85, 95 105 C 85 90, 75 80, 70 85 C 65 80, 60 70, 55 50 C 70 40, 90 35, 110 35 Z" fill="url(#hairGrad)" stroke="#3A202A" strokeWidth="2" strokeLinejoin="round" />
        {/* Right Bang */}
        <path d="M110 35 C 120 65, 130 85, 125 105 C 135 90, 145 80, 150 85 C 155 80, 160 70, 165 50 C 150 40, 130 35, 110 35 Z" fill="url(#hairGrad)" stroke="#3A202A" strokeWidth="2" strokeLinejoin="round" />
        {/* Bang strands */}
        <path d="M100 50 Q 95 70 95 90" fill="none" stroke="#3A202A" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M120 50 Q 125 70 125 90" fill="none" stroke="#3A202A" strokeWidth="1.5" strokeLinecap="round" />
        
        {/* Top Hair Highlight */}
        <path d="M90 35 C 100 30, 120 30, 130 35 C 120 40, 100 40, 90 35 Z" fill="#FFFFFF" opacity="0.4" />


        {/* Hands & Long Arms (Covering logic) */}
        <g className={`transition-transform duration-500 ${isPassword ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          {/* Left Arm & Hand */}
          <g className={`transition-transform duration-300 ${isPeeking ? 'translate-y-4' : ''}`}>
            {/* Arm */}
            <path d="M20 220 C 30 170, 50 140, 75 140 C 95 140, 95 180, 60 220 Z" fill="url(#skinGrad)" stroke="#3A202A" strokeWidth="2.5" strokeLinejoin="round" />
            {/* Hand */}
            <ellipse cx="80" cy="130" rx="16" ry="20" fill="url(#skinGrad)" stroke="#3A202A" strokeWidth="2.5" />
            <path d="M72 115 V 135 M 80 112 V 135 M 88 115 V 135" fill="none" stroke="#D1B3AA" strokeWidth="1.5" strokeLinecap="round" />
          </g>

          {/* Right Arm & Hand */}
          <g className={`transition-transform duration-300 ${isPeeking ? 'translate-y-4' : ''}`}>
            {/* Arm */}
            <path d="M200 220 C 190 170, 170 140, 145 140 C 125 140, 125 180, 160 220 Z" fill="url(#skinGrad)" stroke="#3A202A" strokeWidth="2.5" strokeLinejoin="round" />
            {/* Hand */}
            <ellipse cx="140" cy="130" rx="16" ry="20" fill="url(#skinGrad)" stroke="#3A202A" strokeWidth="2.5" />
            <path d="M148 115 V 135 M 140 112 V 135 M 132 115 V 135" fill="none" stroke="#D1B3AA" strokeWidth="1.5" strokeLinecap="round" />
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
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-[430px]">
        <div className="rounded-lg border border-unihub-border bg-unihub-card p-6 shadow-xl shadow-unihub-primary/10 dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/30 sm:p-8">
          <PinkHairCharacter
            mode={focusedField}
            emailLength={email.length}
            showPassword={showPassword}
          />

          <div className="mt-3 text-center">
            <h1 className="text-2xl font-bold text-unihub-text dark:text-white">Đăng nhập</h1>
            <p className="mt-2 text-sm text-unihub-muted dark:text-gray-400">
              Dùng tài khoản trường hoặc SSO để tiếp tục.
            </p>
          </div>

          <Form method="post" className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-unihub-text dark:text-gray-200">
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
              <span className="mb-2 block text-sm font-semibold text-unihub-text dark:text-gray-200">
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

            <div className="flex items-center justify-between gap-4 text-sm">
              <label className="flex items-center gap-2 text-unihub-muted dark:text-gray-400">
                <input
                  type="checkbox"
                  name="remember"
                  className="h-4 w-4 rounded border-unihub-border text-unihub-primary focus:ring-unihub-primary dark:border-gray-700"
                />
                Ghi nhớ
              </label>
              <Link to="/" className="font-semibold text-unihub-primary hover:text-unihub-primary-hover dark:text-unihub-gold">
                Quên mật khẩu
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-unihub-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-unihub-primary-hover disabled:cursor-not-allowed disabled:opacity-70 dark:bg-unihub-gold dark:text-unihub-text dark:hover:bg-yellow-300"
            >
              {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>

            <button
              type="button"
              className="w-full rounded-lg border border-unihub-border bg-white px-4 py-3 text-sm font-bold text-unihub-text transition hover:border-unihub-primary hover:text-unihub-primary dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:border-unihub-gold dark:hover:text-unihub-gold"
            >
              Đăng nhập bằng SSO
            </button>
          </Form>

          <p className="mt-6 text-center text-xs leading-5 text-unihub-muted dark:text-gray-500">
            Tài khoản sinh viên được đối chiếu với dữ liệu đồng bộ từ trường.
          </p>
        </div>
      </div>
    </section>
  );
}
