'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Building2, 
  Mail, 
  Shield, 
  Lock, 
  ShieldCheck, 
  FileCheck, 
  Activity,
  CheckCircle2,
  Eye,
  EyeOff,
  Info
} from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const loginUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: Include cookies in the request
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      // Store tokens in localStorage for header-based auth
      if (data.accessToken && data.refreshToken) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      // Authentication successful (cookies are set by the server)
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(117deg, #C9C4EE -14.47%, #EFEDFA 42.76%, #E1DEF6 100%)'
      }}
    >
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-start">
        {/* Left Panel - Signup Form */}
        <div className="rounded-2xl p-4 sm:p-6 lg:p-8">
          <div className="mb-6 lg:mb-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Create Account</h1>
            <p className="text-gray-600 text-sm sm:text-base">Sign up to get started with your dashboard</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="eg. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 bg-white border-gray-200"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="eg. 123@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-white border-gray-200"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-white border-gray-200 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="remember"
                checked={rememberDevice}
                onCheckedChange={(checked) => setRememberDevice(checked as boolean)}
                className="mt-0.5"
              />
              <div>
                <label
                  htmlFor="remember"
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Remember this device
                </label>
                <p className="text-xs text-gray-500">Keep me signed in on this device</p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-white font-medium rounded-lg"
              style={{ backgroundColor: '#846BD2' }}
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Sign up'}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-transparent text-gray-500">or continue with</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <a href={loginUrl}>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 bg-white hover:text-white text-gray-700 border border-gray-200 rounded-lg mb-4 transition-colors justify-start"
                  style={{
                    '--hover-bg': '#846BD2'
                  } as React.CSSProperties}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#846BD2';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.borderColor = '#846BD2';
                    const subtitles = e.currentTarget.querySelectorAll('.subtitle-text');
                    subtitles.forEach(el => {
                      (el as HTMLElement).style.color = 'white';
                    });
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.color = 'rgb(55, 65, 81)';
                    e.currentTarget.style.borderColor = 'rgb(229, 231, 235)';
                    const subtitles = e.currentTarget.querySelectorAll('.subtitle-text');
                    subtitles.forEach(el => {
                      (el as HTMLElement).style.color = 'rgb(107, 114, 128)';
                    });
                  }}
                >
                  <Building2 className="w-5 h-5 mr-3" />
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Google</span>
                    <span className="text-xs subtitle-text text-gray-500">Use your google corporate account</span>
                  </div>
                </Button>
              </a>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 bg-white hover:text-white text-gray-700 border border-gray-200 rounded-lg justify-start transition-colors"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#846BD2';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = '#846BD2';
                  const subtitles = e.currentTarget.querySelectorAll('.subtitle-text');
                  subtitles.forEach(el => {
                    (el as HTMLElement).style.color = 'white';
                  });
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.color = 'rgb(55, 65, 81)';
                  e.currentTarget.style.borderColor = 'rgb(229, 231, 235)';
                  const subtitles = e.currentTarget.querySelectorAll('.subtitle-text');
                  subtitles.forEach(el => {
                    (el as HTMLElement).style.color = 'rgb(107, 114, 128)';
                  });
                }}
              >
                <Mail className="w-5 h-5 mr-3 text-gray-600" />
                <div className="flex flex-col items-start">
                  <span className="font-medium">Microsoft Active Directory</span>
                  <span className="text-xs subtitle-text text-gray-500">Sign in with your corporate account</span>
                </div>
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 bg-white hover:text-white text-gray-700 border border-gray-200 rounded-lg justify-start transition-colors"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#846BD2';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = '#846BD2';
                  const subtitles = e.currentTarget.querySelectorAll('.subtitle-text');
                  subtitles.forEach(el => {
                    (el as HTMLElement).style.color = 'white';
                  });
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.color = 'rgb(55, 65, 81)';
                  e.currentTarget.style.borderColor = 'rgb(229, 231, 235)';
                  const subtitles = e.currentTarget.querySelectorAll('.subtitle-text');
                  subtitles.forEach(el => {
                    (el as HTMLElement).style.color = 'rgb(107, 114, 128)';
                  });
                }}
              >
                <Shield className="w-5 h-5 mr-3 text-gray-600" />
                <div className="flex flex-col items-start">
                  <span className="font-medium">Okta SSO</span>
                  <span className="text-xs subtitle-text text-gray-500">Enterprise identity provider</span>
                </div>
              </Button>
            </div>
          </div>

          <div className="mt-6 p-4 bg-purple-50 border border-purple-100 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-purple-900">Corporate Authentication</p>
                <p className="text-xs text-purple-700 mt-1">
                  Use your corporate credentials to access this portal. Contact IT support if you experience any authentication issues.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <a href="/login" className="text-purple-600 hover:underline font-medium">
                Login here
              </a>
            </p>
          </div>
        </div>

        {/* Right Panel - Security & System Status */}
        <div 
          className="space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 lg:min-w-[720px]"
          style={{
            borderRadius: '16px',
            border: '1px solid #E5E2FF',
            background: '#F9F6FF',
          }}
        >
          {/* Security Status Card */}
          <Card className="bg-white/95 backdrop-blur-sm shadow-lg border border-gray-100/50">
            <CardContent className="p-4 sm:p-6 lg:p-8">
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Security Status</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-gray-50">
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm sm:text-base text-gray-900">SSL Encrypted</p>
                    <p className="text-xs sm:text-sm text-gray-500">256-bit encryption</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-gray-50">
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm sm:text-base text-gray-900">Active Directory</p>
                    <p className="text-xs sm:text-sm text-gray-500">Corporate integration</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-gray-50">
                    <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm sm:text-base text-gray-900">Multi-Factor Auth</p>
                    <p className="text-xs sm:text-sm text-gray-500">Enhanced security</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-gray-50">
                    <FileCheck className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm sm:text-base text-gray-900">Audit Logging</p>
                    <p className="text-xs sm:text-sm text-gray-500">Compliance tracking</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compliance Standards Card */}
          <Card className="bg-white/95 backdrop-blur-sm shadow-lg border border-gray-100/50">
            <CardContent className="p-4 sm:p-6 lg:p-8">
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Compliance Standards</h2>
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3">
                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500" />
                  <span className="text-xs sm:text-sm font-medium text-gray-700">Sox Compliant</span>
                </div>
                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500" />
                  <span className="text-xs sm:text-sm font-medium text-gray-700">GDPR Ready</span>
                </div>
                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500" />
                  <span className="text-xs sm:text-sm font-medium text-gray-700">IOS 27001</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Health Card */}
          <Card className="bg-white/95 backdrop-blur-sm shadow-lg border border-gray-100/50">
            <CardContent className="p-4 sm:p-6 lg:p-8">
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">System Health</h2>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm sm:text-base text-gray-900">Authentication Service</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                    <span className="text-xs sm:text-sm font-medium text-teal-600">Online</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm sm:text-base text-gray-900">Directory Sync</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                    <span className="text-xs sm:text-sm font-medium text-teal-600">Synced</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm sm:text-base text-gray-900">Session Management</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                    <span className="text-xs sm:text-sm font-medium text-teal-600">Active</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Support Contact */}
          <div className="text-center text-xs sm:text-sm text-gray-600 backdrop-blur-sm rounded-xl p-4 sm:p-6">
            <p className="text-gray-700">Need help with authentication?</p>
            <p className="mt-2">
              <span className="text-gray-600">Contact IT Support : </span>
              <a href="mailto:support@company.com" className="text-purple-600 hover:underline font-medium">
                support@company.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
