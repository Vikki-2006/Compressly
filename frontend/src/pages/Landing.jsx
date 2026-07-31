import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  ArrowRight, ShieldCheck, Zap, Layers, ChevronDown, 
  HardDrive, Sliders, Play, Check, TrendingDown, 
  Download, Upload, SlidersHorizontal, Clock, Layout
} from "lucide-react";

// Custom Counter Hook component for statistics section
const AnimatedCounter = ({ 
  value, 
  suffix = "", 
  prefix = "", 
  duration = 2000 
}) => {
  const [count, setCount] = useState(0);
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    if (hasRun) return;
    setHasRun(true);
    let start = 0;
    const end = value;
    if (start === end) {
      setCount(end);
      return;
    }
    const steps = 40;
    const increment = Math.ceil(end / steps);
    const stepTime = duration / steps;
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [value, duration, hasRun]);

  return <span>{prefix}{count}{suffix}</span>;
};

export const Landing = ({ setRoute }) => {
  const [openFaq, setOpenFaq] = useState(null);

  const startApp = () => {
    setRoute("#/app");
    window.location.hash = "#/app";
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // Six premium feature cards layout (3x2 matrix)
  const premiumFeatures = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Powered by raw hardware-accelerated local FFmpeg pipes. Compress massive gigabyte-scale videos in seconds.",
    },
    {
      icon: ShieldCheck,
      title: "Privacy First",
      description: "Your video files stay local. Processing occurs 100% offline, meaning zero exposure to cloud servers or remote APIs.",
    },
    {
      icon: Layers,
      title: "Batch Compression",
      description: "Drag-and-drop multiple video files simultaneously. Queue them up to run sequential compression runs in the background.",
    },
    {
      icon: HardDrive,
      title: "Offline Processing",
      description: "No internet connection needed. Once active, Compressly executes video optimization completely locally on your host CPU.",
    },
    {
      icon: Sliders,
      title: "Advanced FFmpeg",
      description: "Full control over compression settings. Fine-tune container formats, video codecs (H.264), and target bitrates.",
    },
    {
      icon: Layout,
      title: "Modern Interface",
      description: "Clean, responsive workspace inspired by Vercel and Linear. Fast workflow transitions with subtle micro-animations.",
    },
  ];

  const faqs = [
    {
      question: "How does the video compression stay private?",
      answer: "Unlike other video compression websites that upload your massive file to remote servers (where they could be stored or indexed), Compressly runs its Python FastAPI backend locally. The video processing is done right on the host system utilizing local CPU and memory resources.",
    },
    {
      question: "What formats and codecs are supported?",
      answer: "We support major containers: MP4, MOV, AVI, and MKV. By default, Compressly transcodes videos to the universal H.264 video codec (via libx264) and AAC audio, ensuring maximum compatibility across web, mobile, and desktop media players.",
    },
    {
      question: "How does the Pause/Resume option work?",
      answer: "We leverage system-level thread suspension using the Python 'psutil' package. When you click pause, the backend suspends the active FFmpeg execution thread. The CPU usage drops immediately to zero percent. Clicking resume releases the suspension, letting FFmpeg pick up exactly where it left off.",
    },
    {
      question: "Are there size limits on video uploads?",
      answer: "Since files are uploaded and stored locally, there are no artificial limits! The only constraints are the storage capacity of the host computer running the backend server. It's built to process gigabyte-scale videos without locking up.",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  // Gentle float anim for right column badge cards
  const floatAnim = (delay) => ({
    animate: {
      y: [0, -8, 0],
    },
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut",
      delay: delay,
    },
  });

  return (
    <div className="font-sans grid-bg min-h-screen text-foreground select-none overflow-x-hidden">
      
      {/* 1. HERO SECTION (WIDER TWO-COLUMN LAYOUT) */}
      <section className="relative overflow-hidden pt-24 pb-20 sm:pt-28 sm:pb-24 lg:pt-36 lg:pb-36 border-b border-border/20">
        {/* Ambient backing glow centered behind the layout */}
        <div className="absolute top-1/2 left-1/2 -z-10 h-[450px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/[0.035] dark:bg-foreground/[0.035] blur-[140px] pointer-events-none" />
        
        <div className="desktop-container grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Headline Content */}
          <div className="lg:col-span-6 flex flex-col items-start text-left space-y-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span className="inline-flex items-center rounded-full bg-foreground/[0.04] dark:bg-foreground/[0.08] px-3.5 py-1.5 text-xs font-semibold text-foreground border border-border/40 backdrop-blur-sm">
                ⚡ Local, Secure & Asynchronous Video Compression
              </span>
            </motion.div>

            <motion.h1
              className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl lg:leading-[1.15] tracking-tighter max-w-[580px]"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Compress Videos Without{" "}
              <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent">
                Losing Quality
              </span>
            </motion.h1>

            <motion.p
              className="max-w-[480px] text-base text-muted-foreground sm:text-lg leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Compress MP4, MOV, AVI, and MKV files directly in your browser. Powered by an offline Python backend using raw FFmpeg configurations.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <button
                onClick={startApp}
                className="group flex items-center space-x-2.5 rounded-xl bg-foreground px-7 py-4 font-semibold text-background dark:bg-foreground dark:text-background hover:opacity-90 active:scale-98 transition-all shadow-lg"
              >
                <span>Launch Workstation</span>
                <ArrowRight className="h-4.5 w-4.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </div>

          {/* Right Column: Interactive App Workstation Mockup */}
          <div className="lg:col-span-6 relative flex justify-center items-center">
            
            {/* Desktop Mockup container */}
            <div className="relative w-full max-w-[560px] bg-[#111214] border border-border/40 rounded-2xl shadow-2xl overflow-hidden glass p-4 select-none relative z-10">
              {/* Window controls header bar */}
              <div className="flex items-center justify-between border-b border-border/10 pb-3 mb-4">
                <div className="flex space-x-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                  <div className="h-3 w-3 rounded-full bg-green-500/80" />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground/60 select-none">/workspace/compressor</span>
                <div className="w-12" />
              </div>

              {/* Active Queue Layout Mockup */}
              <div className="space-y-3.5">
                {/* Dashboard statistics summary inside mockup */}
                <div className="grid grid-cols-3 gap-2 pb-1.5">
                  <div className="bg-background/40 border border-border/10 p-2.5 rounded-lg text-center">
                    <span className="block text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Saved Space</span>
                    <span className="text-sm font-bold text-foreground">84.2 GB</span>
                  </div>
                  <div className="bg-background/40 border border-border/10 p-2.5 rounded-lg text-center">
                    <span className="block text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Ratio</span>
                    <span className="text-sm font-bold text-green-500">92%</span>
                  </div>
                  <div className="bg-background/40 border border-border/10 p-2.5 rounded-lg text-center">
                    <span className="block text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Queue status</span>
                    <span className="text-sm font-bold text-yellow-500">Active</span>
                  </div>
                </div>

                {/* Queue list item 1 (Active) */}
                <div className="bg-background/50 border border-border/15 p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-3.5">
                    <div className="h-10 w-12 bg-muted/60 border border-border/10 rounded flex items-center justify-center relative overflow-hidden shrink-0">
                      <div className="absolute bottom-1 right-1 bg-background/80 px-1 rounded text-[8px] font-mono">1080p</div>
                      <Play className="h-3.5 w-3.5 text-muted-foreground fill-current opacity-60" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-foreground truncate max-w-[140px]">interview_final.mp4</h4>
                      <span className="text-[10px] text-muted-foreground">145.2 MB &bull; Compressing...</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-foreground">78%</span>
                    <div className="w-16 bg-muted/50 h-1.5 rounded-full overflow-hidden mt-1 border border-border/10">
                      <div className="bg-foreground h-full rounded-full" style={{ width: "78%" }} />
                    </div>
                  </div>
                </div>

                {/* Queue list item 2 (Completed) */}
                <div className="bg-background/30 border border-border/10 p-3 rounded-xl flex items-center justify-between opacity-80">
                  <div className="flex items-center space-x-3.5">
                    <div className="h-10 w-12 bg-muted/60 border border-border/10 rounded flex items-center justify-center shrink-0">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-foreground truncate max-w-[140px]">hero_render.mov</h4>
                      <span className="text-[10px] text-muted-foreground">42.8 MB &bull; 9.2 MB finished</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[10px] font-semibold bg-green-500/10 text-green-500 px-2 py-0.5 rounded">Success</span>
                    <span className="text-[9px] text-muted-foreground mt-1">-82% Savings</span>
                  </div>
                </div>

                {/* Mini configuration board mockup */}
                <div className="border-t border-border/10 pt-3 mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span>Preset: <strong>Balanced (CRF 23)</strong></span>
                  </div>
                  <span>Codec: <strong>H.264 (libx264)</strong></span>
                </div>
              </div>
            </div>

            {/* Floating Glass Badges */}
            <motion.div 
              className="absolute -top-6 -left-6 z-20 px-3.5 py-2 rounded-xl bg-background/60 border border-border/30 glass flex items-center space-x-2 text-xs font-semibold shadow-md pointer-events-none"
              {...floatAnim(0)}
            >
              <TrendingDown className="h-4 w-4 text-green-500" />
              <span>92% Size Reduction</span>
            </motion.div>

            <motion.div 
              className="absolute -bottom-4 -left-2 z-20 px-3.5 py-2 rounded-xl bg-background/60 border border-border/30 glass flex items-center space-x-2 text-xs font-semibold shadow-md pointer-events-none"
              {...floatAnim(1.5)}
            >
              <ShieldCheck className="h-4 w-4 text-foreground" />
              <span>Privacy First</span>
            </motion.div>

            <motion.div 
              className="absolute top-1/2 -right-8 z-20 px-3.5 py-2 rounded-xl bg-background/60 border border-border/30 glass flex items-center space-x-2 text-xs font-semibold shadow-md pointer-events-none"
              {...floatAnim(3)}
            >
              <Zap className="h-4 w-4 text-foreground" />
              <span>Local Processing</span>
            </motion.div>

          </div>

        </div>
      </section>

      {/* 2. FEATURES GRID SECTION (3x2 MATRIX DESIGN) */}
      <section className="py-24 sm:py-32 border-b border-border/20 bg-foreground/[0.003] dark:bg-foreground/[0.001]">
        <div className="desktop-container">
          <div className="text-center max-w-3xl mx-auto space-y-5">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl tracking-tighter">
              Engineered for Modern Teams
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              We took the raw multithreaded power of high-performance FFmpeg and wrapped it in a pixel-perfect, offline browser interface.
            </p>
          </div>

          <motion.div
            className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {premiumFeatures.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={idx}
                  className="relative rounded-2xl border border-border/40 p-8 dark:bg-card/45 glass hover:shadow-xl hover:border-foreground/20 hover:-translate-y-1 transition-all duration-300 group flex flex-col items-start"
                  variants={itemVariants}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/5 dark:bg-foreground/10 text-foreground mb-6 group-hover:scale-105 transition-transform duration-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground tracking-tight">{feat.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    {feat.description}
                  </p>
                  
                  {/* Subtle border glow effect */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 border border-foreground/10 pointer-events-none" />
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* 3. PRODUCT SHOWCASE CENTERPIECE */}
      <section className="py-24 sm:py-32 border-b border-border/20">
        <div className="desktop-container flex flex-col items-center">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest block">Core Workstation</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl tracking-tighter">
              A Complete Offline Studio
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Experience the actual application layout. A fully-fledged video compressor dashboard that runs entirely on your local machine.
            </p>
          </div>

          {/* Large mock display container */}
          <div className="w-full max-w-[1200px] bg-[#111214] border border-border/40 rounded-2xl shadow-2xl overflow-hidden glass select-none">
            {/* Header tab controls */}
            <div className="flex items-center justify-between border-b border-border/10 px-5 py-4 bg-background/30">
              <div className="flex space-x-2">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex items-center space-x-2 border border-border/15 bg-background/50 rounded-lg px-4 py-1 text-[11px] text-muted-foreground w-72 justify-center font-mono">
                <span>http://localhost:5173/#/app</span>
              </div>
              <div className="w-12" />
            </div>

            {/* Mock layout columns split */}
            <div className="grid grid-cols-12 min-h-[480px]">
              
              {/* Sidebar layout mockup */}
              <div className="col-span-3 border-r border-border/10 p-5 bg-background/25 space-y-6">
                <div className="space-y-2">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Configure settings</span>
                  <div className="bg-background/40 border border-border/10 p-3 rounded-xl space-y-4">
                    
                    {/* Presets option */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-muted-foreground font-semibold block">Quality preset</label>
                      <div className="bg-background/60 border border-border/10 p-2 rounded text-xs text-foreground font-semibold flex justify-between">
                        <span>Balanced (CRF 23)</span>
                        <ChevronDown className="h-3 w-3 text-muted-foreground mt-0.5" />
                      </div>
                    </div>

                    {/* Output option */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-muted-foreground font-semibold block">Output format</label>
                      <div className="bg-background/60 border border-border/10 p-2 rounded text-xs text-foreground font-semibold flex justify-between">
                        <span>MP4 (Universal)</span>
                        <ChevronDown className="h-3 w-3 text-muted-foreground mt-0.5" />
                      </div>
                    </div>

                    {/* Target Bitrate option */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-muted-foreground font-semibold block">Custom Bitrate limit</label>
                      <div className="w-full bg-muted/60 h-1 rounded-full relative mt-2">
                        <div className="bg-foreground h-full w-2/3 rounded-full relative">
                          <div className="h-3 w-3 bg-foreground border-2 border-background rounded-full absolute -top-1 right-0 shadow" />
                        </div>
                      </div>
                      <span className="text-[9px] text-muted-foreground text-right block mt-1">12 Mbps</span>
                    </div>

                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider font-mono">Status indicators</span>
                  <div className="bg-[#1a1c1e]/40 border border-border/10 p-3 rounded-xl space-y-2 text-[10px] text-muted-foreground font-mono">
                    <p>&bull; Backend: <span className="text-green-500 font-bold">ONLINE</span></p>
                    <p>&bull; Database: <span className="text-green-500 font-bold">SQLITE 3</span></p>
                    <p>&bull; Daemon cleanup: <span className="text-green-500 font-bold">ACTIVE</span></p>
                  </div>
                </div>
              </div>

              {/* Main Panel Content Mockup */}
              <div className="col-span-9 p-6 space-y-6">
                
                {/* Active workspace header mock */}
                <div className="flex items-center justify-between border-b border-border/10 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-lg bg-foreground/5 flex items-center justify-center text-foreground shrink-0 border border-border/10">
                      <SlidersHorizontal className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Asynchronous compression workstation</h3>
                      <p className="text-[10px] text-muted-foreground">Queue files, adjust output preferences, and save space.</p>
                    </div>
                  </div>
                  
                  {/* Process Buttons */}
                  <div className="flex space-x-2">
                    <div className="bg-muted/80 px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-border/10 text-muted-foreground">Pause All</div>
                    <div className="bg-foreground text-background dark:bg-foreground dark:text-background px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-border/10 shadow-sm">Compress Queue</div>
                  </div>
                </div>

                {/* Simulated File upload details */}
                <div className="bg-background/40 border border-border/10 rounded-xl p-5 grid grid-cols-12 gap-6 items-center">
                  {/* Mock thumbnail representation */}
                  <div className="col-span-4 h-24 bg-muted/60 border border-border/10 rounded-lg relative overflow-hidden flex items-center justify-center shrink-0">
                    <Play className="h-6 w-6 text-muted-foreground fill-current opacity-50" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    <div className="absolute bottom-2 left-2 text-[9px] font-semibold text-foreground bg-background/50 px-2 py-0.5 rounded">vacation_trip.mov</div>
                  </div>

                  {/* Mock Comparison details stats */}
                  <div className="col-span-8 space-y-3.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Compression ratio</span>
                      <span className="text-green-500">89% Space Saved</span>
                    </div>

                    {/* Progress slider bar representation */}
                    <div className="w-full bg-muted/50 h-2.5 rounded-full overflow-hidden border border-border/10 relative">
                      <div className="bg-foreground h-full rounded-full w-4/5" />
                    </div>

                    {/* Meta stats data */}
                    <div className="grid grid-cols-4 gap-2 text-[10px] text-muted-foreground">
                      <div>
                        <span className="block font-semibold uppercase text-muted-foreground/60">Original</span>
                        <span className="font-bold text-foreground">845.2 MB</span>
                      </div>
                      <div>
                        <span className="block font-semibold uppercase text-muted-foreground/60">Compressed</span>
                        <span className="font-bold text-green-500">92.9 MB</span>
                      </div>
                      <div>
                        <span className="block font-semibold uppercase text-muted-foreground/60">Resolution</span>
                        <span className="font-bold text-foreground">1080p @ 60fps</span>
                      </div>
                      <div>
                        <span className="block font-semibold uppercase text-muted-foreground/60">Codec</span>
                        <span className="font-bold text-foreground">H.264 (x264)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional list stack item mockup */}
                <div className="border border-border/10 rounded-xl p-4 flex items-center justify-between bg-background/20 opacity-80">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-10 bg-muted/60 border border-border/10 rounded flex items-center justify-center shrink-0">
                      <Check className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">vlog_tokyo.mkv</h4>
                      <p className="text-[10px] text-muted-foreground">Original: 1.2 GB &bull; Compressed: 145 MB finished in 42s</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold bg-green-500/10 text-green-500 px-3 py-1 rounded">Completed</span>
                </div>

              </div>

            </div>

          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS SECTION (TIMELINE STEPS MAP) */}
      <section className="py-24 sm:py-32 border-b border-border/20 bg-foreground/[0.003] dark:bg-foreground/[0.001]">
        <div className="desktop-container">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <span className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest block">Process Workflow</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl tracking-tighter">
              Four Steps to Optimization
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Compressly simplifies FFmpeg pipelines down into an elegant, automated local pipeline structure.
            </p>
          </div>

          {/* Connected timeline cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            
            {/* Steps block */}
            {[
              {
                step: "01",
                icon: Upload,
                title: "Upload",
                description: "Drag-and-drop multiple video clips directly into the queue workstation interface.",
              },
              {
                step: "02",
                icon: SlidersHorizontal,
                title: "Configure",
                description: "Select balanced preset configurations or toggle target bitrate sliders.",
              },
              {
                step: "03",
                icon: Clock,
                title: "Compress",
                description: "Start local multithreaded compression, monitor progress, or pause the process.",
              },
              {
                step: "04",
                icon: Download,
                title: "Download",
                description: "Save optimized, lossless-quality outputs directly back to your local folder.",
              },
            ].map((st, idx) => {
              const Icon = st.icon;
              return (
                <div key={idx} className="relative bg-background/45 border border-border/40 p-7 rounded-2xl glass hover:shadow-lg transition-all duration-300 group flex flex-col items-start select-none">
                  {/* Step label index */}
                  <span className="text-[10px] font-mono font-bold text-muted-foreground/40 absolute top-4 right-4">{st.step}</span>
                  
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/5 dark:bg-foreground/10 text-foreground mb-5 shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  <h3 className="text-base font-bold text-foreground tracking-tight">{st.title}</h3>
                  <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed">{st.description}</p>
                </div>
              );
            })}

          </div>
        </div>
      </section>

      {/* 5. STATISTICS METRIC BADGES WITH COUNTERS */}
      <section className="py-20 sm:py-24 border-b border-border/20">
        <div className="desktop-container">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            
            <div className="bg-background/45 border border-border/30 p-8 rounded-2xl glass text-center flex flex-col items-center">
              <span className="text-4xl font-extrabold text-foreground tracking-tight mb-2">
                <AnimatedCounter value={10} suffix="x" />
              </span>
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Faster encoding</span>
            </div>

            <div className="bg-background/45 border border-border/30 p-8 rounded-2xl glass text-center flex flex-col items-center">
              <span className="text-4xl font-extrabold text-foreground tracking-tight mb-2">
                <AnimatedCounter value={100} suffix="%" />
              </span>
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Local executions</span>
            </div>

            <div className="bg-background/45 border border-border/30 p-8 rounded-2xl glass text-center flex flex-col items-center">
              <span className="text-4xl font-extrabold text-foreground tracking-tight mb-2">
                <AnimatedCounter value={0} prefix="Zero" />
              </span>
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Cloud uploads</span>
            </div>

            <div className="bg-background/45 border border-border/30 p-8 rounded-2xl glass text-center flex flex-col items-center">
              <span className="text-4xl font-extrabold text-foreground tracking-tight mb-2">
                <AnimatedCounter value={50} suffix="+" />
              </span>
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Format combinations</span>
            </div>

          </div>
        </div>
      </section>

      {/* 6. FAQ (TWO-COLUMN GRID ACCORDIONS) */}
      <section className="py-24 sm:py-32 border-b border-border/20 bg-foreground/[0.003] dark:bg-foreground/[0.001]">
        <div className="desktop-container">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <span className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest block">Answers</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl tracking-tighter">
              Frequently Asked Questions
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              Everything you need to know about local execution, compatibility, and threading performance.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1400px] mx-auto items-start">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-border/40 overflow-hidden dark:bg-card/30 glass transition-all duration-300"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="flex w-full items-center justify-between px-6 py-5 text-left text-foreground hover:bg-foreground/[0.02] dark:hover:bg-foreground/[0.01] transition-all"
                  >
                    <span className="font-bold tracking-tight text-[15px] sm:text-base">{faq.question}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${
                        isOpen ? "rotate-180 text-foreground" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-border/20 px-6 py-5 text-sm text-muted-foreground leading-relaxed bg-foreground/[0.015]">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. PREMIUM FINAL CTA SECTION */}
      <section className="bg-foreground text-background dark:bg-foreground dark:text-background py-24 sm:py-32 text-center relative overflow-hidden">
        {/* Soft atmospheric radial back-glow */}
        <div className="absolute top-1/2 left-1/2 -z-10 h-[380px] w-[750px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-background/[0.08] dark:bg-background/[0.08] blur-[100px] pointer-events-none" />
        
        <div className="desktop-container relative z-10 flex flex-col items-center space-y-6">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl tracking-tighter max-w-[650px] leading-tight">
            Ready to optimize your media?
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto text-base sm:text-lg leading-relaxed">
            Start processing multiple videos right away with 100% data exposure protection.
          </p>
          <button
            onClick={startApp}
            className="mt-4 inline-flex items-center space-x-2 rounded-xl bg-background px-8 py-4 font-semibold text-foreground dark:bg-background dark:text-foreground hover:opacity-90 hover:scale-[1.01] active:scale-98 transition-all shadow-xl"
          >
            <span>Launch Workstation</span>
            <ArrowRight className="h-4.5 w-4.5" />
          </button>
        </div>
      </section>

    </div>
  );
};
