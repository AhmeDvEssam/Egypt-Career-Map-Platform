export default function LoginVariant2() {
  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row antialiased overflow-x-hidden">

{/* Suppressed TopNavBar & Footer as this is a linear/transactional screen */}
{/* LEFT SIDE: Hero Map Area */}
<div className="relative w-full md:w-1/2 h-[50vh] md:h-screen bg-surface-container-lowest flex flex-col justify-between p-margin-mobile md:p-margin-desktop overflow-hidden border-b md:border-b-0 md:border-r border-outline-variant/30">
{/* Map Background */}
<div className="absolute inset-0 w-full h-full z-0 pointer-events-none" style={{backgroundImage: "url(\'https://lh3.googleusercontent.com/aida-public/AB6AXuAHkFgwhr1QrZz7oNcvl_aJuXUKyQrfOTfruKUtqErP7S0UDdrkJLxwMqEHuz96UcGZ-Wytq4S13uqmPx7EhXUHJvfFsIna_EjQI-zZIBxgTjPDI5BloylXPpU9PqQaxbEOaN4GKlp40SBBtpl55cx52XngLrDxuIIgmqLc1x7lUrQoSiNNrmhBXAQbO4JBt5huEsA_mQB72odDE5U_abYA5RIHniycIF-v9kIndzIN_kgA7qJslTAH\')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat'}}>
{/* Overlay to ensure text readability */}
<div className="absolute inset-0 bg-gradient-to-b from-surface-container-lowest/80 via-transparent to-surface-container-lowest/90"></div>
</div>
{/* Top Left Brand */}
<div className="relative z-10">
<h1 className="font-display-lg text-display-lg text-primary neon-text-glow tracking-tight uppercase">
                Egypt's<br/>Career Map
            </h1>
</div>
{/* Center Insight Glass Card */}
<div className="relative z-10 my-auto md:max-w-[80%]">
<div className="glass-panel p-8 rounded-xl">
<div className="flex items-center gap-2 mb-4">
<span className="material-symbols-outlined text-secondary" style={{fontVariationSettings: "'FILL' 1"}}>insights</span>
<span className="font-label-sm text-label-sm text-secondary uppercase tracking-widest">Aether Intelligence</span>
</div>
<p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                    Powered by real-time Data &amp; AI. We aggregate and analyze thousands of live jobs from LinkedIn, Wuzzuf, and Indeed. Find every job in Egypt in one intelligent platform.
                </p>
</div>
</div>
{/* Bottom Quote */}
<div className="relative z-10 mt-auto pt-8">
<p className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface italic font-light opacity-90 border-l-4 border-tertiary pl-6">
                "Stop searching. Start discovering where you belong."
            </p>
</div>
</div>
{/* RIGHT SIDE: Login Container */}
<div className="w-full md:w-1/2 h-full min-h-[50vh] md:min-h-screen bg-[#0F172A] flex items-center justify-center p-margin-mobile md:p-margin-desktop">
<div className="w-full max-w-md mx-auto relative z-10">
{/* Form Header */}
<div className="mb-10 text-center md:text-left">
<h2 className="font-display-lg text-display-lg text-on-surface mb-4">Welcome Back</h2>
<p className="font-body-md text-body-md text-on-surface-variant">
                    Sign in to unlock personalized AI career coaching, custom salary insights, and advanced job matching.
                </p>
</div>
{/* Login Form */}
<form className="space-y-6">
<div className="space-y-2">
<label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block" htmlFor="email">Email Address</label>
<div className="relative">
<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
<span className="material-symbols-outlined text-outline">mail</span>
</div>
<input className="w-full pl-12 pr-4 py-3 input-bg text-on-surface rounded-lg border focus:ring-0 input-focus-glow transition-all duration-300 font-body-md placeholder-outline-variant" id="email" placeholder="john.doe@example.com" required type="email"/>
</div>
</div>
<div className="space-y-2">
<div className="flex justify-between items-center">
<label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block" htmlFor="password">Password</label>
<a className="font-label-sm text-label-sm text-secondary hover:text-primary transition-colors" href="#">Forgot Password?</a>
</div>
<div className="relative">
<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
<span className="material-symbols-outlined text-outline">lock</span>
</div>
<input className="w-full pl-12 pr-4 py-3 input-bg text-on-surface rounded-lg border focus:ring-0 input-focus-glow transition-all duration-300 font-body-md placeholder-outline-variant" id="password" placeholder="••••••••" required type="password"/>
</div>
</div>
<button className="w-full bg-tertiary text-on-tertiary-container font-label-md text-label-md py-4 rounded-lg uppercase tracking-widest font-bold btn-primary-glow transition-all duration-300 mt-8 flex justify-center items-center gap-2" type="submit">
<span>Sign In</span>
<span className="material-symbols-outlined text-sm">arrow_forward</span>
</button>
</form>
{/* Divider */}
<div className="my-10 flex items-center">
<div className="flex-grow border-t border-outline-variant/30"></div>
<span className="px-4 font-label-sm text-label-sm text-outline-variant uppercase tracking-widest">Or Continue With</span>
<div className="flex-grow border-t border-outline-variant/30"></div>
</div>
{/* Social Logins */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
<button className="flex items-center justify-center gap-2 bg-surface-container-high hover:bg-surface-variant text-on-surface border border-outline-variant/30 py-3 rounded-lg transition-colors duration-200">
<img alt="Google" className="w-5 h-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8ZtUUXXFifLaQz8zvXcFAvF3yabhK82JT2Bk_Vs-KSqkzT8d5LItgQEa8f5vcy0qWj6MZYMWMee0wkElsE8z7eCSqBnPobPH7T99Y_Z1rhD9XdrUvq87C29wpBHBDFCEzuBmaFJUTAKcD4NGfE4s6xgIBrCvPQnTuc07I8RU1mb_agzQRyuDk1hHpaTijHCX27ii_w4Xu5_u6cas4ekvLm3SK6oMtYWVL01DN3wt4E_cvCtwgErT0"/>
<span className="font-label-sm text-label-sm md:hidden">Google</span>
</button>
<button className="flex items-center justify-center gap-2 bg-surface-container-high hover:bg-surface-variant text-on-surface border border-outline-variant/30 py-3 rounded-lg transition-colors duration-200">
<img alt="LinkedIn" className="w-5 h-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBgN8Kw69nO7fPKOE0mOOTC-eyIQZbL13WtLKNQ_wNeqcD9wt82anmJBAPrab12VFtvymADFbxVH-u9u0YplFQbvNINEomMLYpkSYFbTCdz6AlnX06cBXInua55_bffMzoWYtnqCIHIA_Ump9vwYV535eQ66c8I0VhoPB4PNRZ1kESBL5yW67Pj_QVXTaW0al7OLlutkduXXBNlHUFeRP8M6XsfzGJ_LK0OUP-Y9v-5RFqo8dcHzeeA"/>
<span className="font-label-sm text-label-sm md:hidden">LinkedIn</span>
</button>
<button className="flex items-center justify-center gap-2 bg-surface-container-high hover:bg-surface-variant text-on-surface border border-outline-variant/30 py-3 rounded-lg transition-colors duration-200">
<img alt="GitHub" className="w-5 h-5 filter invert" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCmQieyXQETswjab14AMZUHVKg7z6mK8452BA_4dxy-0wBF3XqiWKjJx3ZiLXiM5cezlqLEIa5GiXFEjr7Cx72Goxn74cCN1auE0ZdYLZxGvk2GGJlMz4333egBIfHHRQSxca_8mS9Fwm6xVbEbYY5aKS3_Z0MoiwOSJON8bSpt5MDJr2m5-7nTjs7oBjSJzcDKYOMOk2MDdja81gfRl5yO2PfKvRAPy8TXF8-cGHJsScIq4eh5e6ks"/>
<span className="font-label-sm text-label-sm md:hidden">GitHub</span>
</button>
</div>
<p className="text-center mt-8 font-body-md text-on-surface-variant text-sm">
                Don't have an account? <a className="text-primary hover:text-secondary transition-colors font-medium" href="#">Request Access</a>
</p>
</div>
</div>

    </div>
  );
}
