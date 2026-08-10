import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Target, 
  BarChart3, 
  Upload, 
  Sliders, 
  Cpu, 
  Download, 
  FileVideo, 
  Check, 
  Lock, 
  Trash2, 
  Layers, 
  Server, 
  Database, 
  Box,
  Code2,
  Sparkles,
  ArrowDown,
  Film
} from "lucide-react";

export const Landing = ({ setRoute }) => {
  // Hero Mockup animation cycle: UPLOAD -> COMPRESSING -> COMPLETE
  const [mockStep, setMockStep] = useState(0);
  const [mockProgress, setMockProgress] = useState(15);

  useEffect(() => {
    const timer = setInterval(() => {
      setMockStep((prev) => (prev + 1) % 3);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  // Progress animation during COMPRESSING state
  useEffect(() => {
    if (mockStep === 1) {
      setMockProgress(20);
      const progTimer = setInterval(() => {
        setMockProgress((p) => {
          if (p >= 78) {
            clearInterval(progTimer);
            return 78;
          }
          return p + 8;
        });
      }, 120);
      return () => clearInterval(progTimer);
    }
  }, [mockStep]);

  const startApp = () => {
    if (setRoute) {
      setRoute("#/app");
    }
    window.location.hash = "#/app";
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } 
    },
  };

  return (
    <div className="font-sans min-h-screen bg-background text-foreground select-none overflow-x-hidden">
      
      {/* ==========================================
          1. HERO SECTION
         ========================================== */}
      <section className="relative pt-16 pb-12 md:pt-24 md:pb-20 lg:pt-28 lg:pb-24 border-b border-border/20">
        {/* Subtle background glow */}
        <div className="absolute top-1/3 left-1/2 -z-10 h-[360px] w-[650px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/[0.025] blur-[120px] pointer-events-none" />

        <div className="desktop-container grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Column: Hero Text */}
          <div className="lg:col-span-6 flex flex-col items-start text-left space-y-5">
            
            {/* Pill Badge */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-foreground/[0.03] px-3.5 py-1.5 text-xs font-medium text-foreground backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                High-Performance Local FFmpeg Engine
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1] tracking-tighter"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              Compress Videos Without Losing Quality
            </motion.h1>

            {/* Description */}
            <motion.p
              className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              Privacy-focused video compression tool. Compress MP4, MOV, AVI, and MKV files directly on your machine without third-party cloud uploads.
            </motion.p>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.3 }}
              className="pt-1"
            >
              <button
                onClick={startApp}
                className="group relative inline-flex items-center justify-center space-x-2.5 rounded-xl bg-foreground px-6 py-3.5 text-sm font-semibold text-background dark:bg-foreground dark:text-background hover:opacity-95 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-md"
              >
                <span>Launch Workstation</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </motion.div>
          </div>

          {/* Right Column: Realistic Product Preview Mockup */}
          <div className="lg:col-span-6 relative flex justify-center items-center">
            
            <div className="relative w-full max-w-[520px] bg-card border border-border/50 rounded-2xl shadow-xl overflow-hidden glass p-4 select-none">
              
              {/* Mock Window Header */}
              <div className="flex items-center justify-between border-b border-border/20 pb-3 mb-4">
                <div className="flex space-x-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/70" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                  <div className="h-3 w-3 rounded-full bg-green-500/70" />
                </div>
                <span className="text-[11px] font-mono text-muted-foreground/70">compressly — workstation</span>
                <div className="w-12" />
              </div>

              {/* Animated Mockup States: UPLOAD -> COMPRESSING -> COMPLETE */}
              <div className="space-y-4 min-h-[210px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {mockStep === 0 && (
                    <motion.div
                      key="step-upload"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <Upload className="h-3.5 w-3.5 animate-pulse text-blue-400" /> Uploading media...
                        </span>
                        <span className="font-mono text-[11px]">24%</span>
                      </div>
                      <div className="bg-background/80 border border-border/30 p-3.5 rounded-xl flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-lg bg-foreground/5 border border-border/30 flex items-center justify-center text-foreground">
                            <FileVideo className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-foreground">interview_final.mp4</h4>
                            <p className="text-[10px] text-muted-foreground">145.2 MB &bull; Reading video metadata</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold bg-foreground/10 px-2 py-0.5 rounded text-foreground">UPLOAD</span>
                      </div>
                      <div className="h-1.5 w-full bg-foreground/10 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-[24%] transition-all duration-300" />
                      </div>
                    </motion.div>
                  )}

                  {mockStep === 1 && (
                    <motion.div
                      key="step-compressing"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <Cpu className="h-3.5 w-3.5 animate-spin text-amber-400" /> Compressing video...
                        </span>
                        <span className="font-mono text-[11px] font-bold text-foreground">{mockProgress}%</span>
                      </div>
                      <div className="bg-background/80 border border-border/30 p-3.5 rounded-xl flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-lg bg-foreground/5 border border-border/30 flex items-center justify-center text-foreground">
                            <FileVideo className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-foreground">interview_final.mp4</h4>
                            <p className="text-[10px] text-muted-foreground">145.2 MB &bull; FFmpeg libx264 (CRF 23)</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded">COMPRESSING</span>
                      </div>
                      <div className="h-1.5 w-full bg-foreground/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-foreground transition-all duration-150" 
                          style={{ width: `${mockProgress}%` }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {mockStep === 2 && (
                    <motion.div
                      key="step-complete"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5" /> Compression Complete ✓
                        </span>
                        <span className="font-bold text-emerald-400 text-xs">93.7% Saved</span>
                      </div>
                      <div className="bg-emerald-500/5 border border-emerald-500/30 p-3.5 rounded-xl flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <Check className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-foreground">interview_final.mp4</h4>
                            <p className="text-[10px] text-muted-foreground">
                              145.2 MB &rarr; <strong className="text-emerald-400">9.2 MB</strong>
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">COMPLETE</span>
                      </div>
                      <div className="h-1.5 w-full bg-emerald-500/20 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-full" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Preset specs footer bar inside mockup */}
                <div className="border-t border-border/20 pt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Preset: <strong className="text-foreground">Balanced (720p)</strong></span>
                  <span>Codec: <strong className="text-foreground">H.264 / AAC</strong></span>
                </div>
              </div>
            </div>

            {/* Floating Status Badges */}
            <div className="hidden sm:flex absolute -top-4 -left-4 z-20 items-center space-x-2 rounded-xl border border-border/40 bg-card/95 px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-md">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>Local Processing</span>
            </div>

            <div className="hidden sm:flex absolute -bottom-4 -left-2 z-20 items-center space-x-2 rounded-xl border border-border/40 bg-card/95 px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-md">
              <Lock className="h-3.5 w-3.5 text-emerald-400" />
              <span>Privacy First</span>
            </div>

            <div className="hidden sm:flex absolute top-1/2 -right-6 z-20 items-center space-x-2 rounded-xl border border-border/40 bg-card/95 px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-md">
              <BarChart3 className="h-3.5 w-3.5 text-foreground" />
              <span>93% Size Reduction</span>
            </div>

          </div>

        </div>
      </section>


      {/* ==========================================
          2. FEATURE STRIP
         ========================================== */}
      <section className="py-5 border-b border-border/20 bg-card/30 backdrop-blur-sm">
        <div className="desktop-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center text-center">
            
            <div className="flex items-center justify-center space-x-2 py-2 px-3 rounded-xl hover:bg-foreground/[0.04] hover:-translate-y-0.5 transition-all duration-200 transform-gpu cursor-default">
              <Zap className="h-4 w-4 text-foreground/80 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-foreground/90">Fast Compression</span>
            </div>

            <div className="flex items-center justify-center space-x-2 py-2 px-3 rounded-xl hover:bg-foreground/[0.04] hover:-translate-y-0.5 transition-all duration-200 transform-gpu cursor-default">
              <ShieldCheck className="h-4 w-4 text-foreground/80 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-foreground/90">Privacy First</span>
            </div>

            <div className="flex items-center justify-center space-x-2 py-2 px-3 rounded-xl hover:bg-foreground/[0.04] hover:-translate-y-0.5 transition-all duration-200 transform-gpu cursor-default">
              <Target className="h-4 w-4 text-foreground/80 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-foreground/90">Quality Control</span>
            </div>

            <div className="flex items-center justify-center space-x-2 py-2 px-3 rounded-xl hover:bg-foreground/[0.04] hover:-translate-y-0.5 transition-all duration-200 transform-gpu cursor-default">
              <BarChart3 className="h-4 w-4 text-foreground/80 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-foreground/90">Compression Analytics</span>
            </div>

          </div>
        </div>
      </section>


      {/* ==========================================
          3. HOW COMPRESSLY WORKS (Compact Responsive Row)
         ========================================== */}
      <section className="py-14 md:py-20 border-b border-border/20">
        <div className="desktop-container">
          
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              How Compressly Works
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Four simple steps from raw media to optimized video.
            </p>
          </div>

          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {[
              {
                num: "01",
                icon: Upload,
                title: "Upload",
                description: "Drop your video into Compressly.",
              },
              {
                num: "02",
                icon: Sliders,
                title: "Customize",
                description: "Choose your compression settings.",
              },
              {
                num: "03",
                icon: Cpu,
                title: "Compress",
                description: "FFmpeg processes your video.",
              },
              {
                num: "04",
                icon: Download,
                title: "Download",
                description: "Get your optimized video.",
              },
            ].map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="group rounded-xl border border-border/40 bg-card p-5 glass flex flex-col items-start space-y-3 hover:border-border/80 hover:-translate-y-1 transition-all duration-200 transform-gpu shadow-sm hover:shadow-md"
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="h-9 w-9 rounded-lg bg-foreground/5 border border-border/30 flex items-center justify-center text-foreground group-hover:scale-105 group-hover:bg-foreground/10 transition-all duration-200">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-muted-foreground/60">{step.num}</span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

        </div>
      </section>


      {/* ==========================================
          4. WHY COMPRESSLY?
         ========================================== */}
      <section className="py-14 md:py-20 border-b border-border/20 bg-foreground/[0.002]">
        <div className="desktop-container">
          
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Why Compressly?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Designed for speed, visual clarity, and data protection.
            </p>
          </div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <motion.div 
              variants={itemVariants}
              className="group rounded-xl border border-border/40 bg-card p-5 glass flex flex-col items-start space-y-2.5 hover:border-border/80 hover:-translate-y-1 transition-all duration-200 transform-gpu shadow-sm hover:shadow-md"
            >
              <div className="h-9 w-9 rounded-lg bg-foreground/5 border border-border/30 flex items-center justify-center text-foreground group-hover:scale-105 group-hover:bg-foreground/10 transition-all duration-200">
                <Lock className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Privacy by Design</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A privacy-focused compression workflow.
              </p>
            </motion.div>

            <motion.div 
              variants={itemVariants}
              className="group rounded-xl border border-border/40 bg-card p-5 glass flex flex-col items-start space-y-2.5 hover:border-border/80 hover:-translate-y-1 transition-all duration-200 transform-gpu shadow-sm hover:shadow-md"
            >
              <div className="h-9 w-9 rounded-lg bg-foreground/5 border border-border/30 flex items-center justify-center text-foreground group-hover:scale-105 group-hover:bg-foreground/10 transition-all duration-200">
                <Cpu className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">FFmpeg Powered</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Professional video processing powered by FFmpeg.
              </p>
            </motion.div>

            <motion.div 
              variants={itemVariants}
              className="group rounded-xl border border-border/40 bg-card p-5 glass flex flex-col items-start space-y-2.5 hover:border-border/80 hover:-translate-y-1 transition-all duration-200 transform-gpu shadow-sm hover:shadow-md"
            >
              <div className="h-9 w-9 rounded-lg bg-foreground/5 border border-border/30 flex items-center justify-center text-foreground group-hover:scale-105 group-hover:bg-foreground/10 transition-all duration-200">
                <Target className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Quality First</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Reduce file size while maintaining visual quality.
              </p>
            </motion.div>
          </motion.div>

        </div>
      </section>


      {/* ==========================================
          5. REAL COMPRESSION RESULTS (BEFORE / AFTER)
         ========================================== */}
      <section className="py-14 md:py-20 border-b border-border/20">
        <div className="desktop-container">
          
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Real Compression Results
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Maximum storage savings without noticeable visual loss.
            </p>
          </div>

          {/* Comparison Card */}
          <div className="max-w-3xl mx-auto rounded-2xl border border-border/50 bg-card p-6 glass">
            
            {/* Header Badge */}
            <div className="flex justify-center mb-5">
              <span className="text-[11px] font-semibold text-muted-foreground bg-foreground/5 border border-border/30 px-3 py-1 rounded-full">
                Balanced &bull; 1080p &bull; H.264
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-11 gap-5 items-center">
              
              {/* ORIGINAL VIDEO */}
              <div className="md:col-span-5 rounded-xl border border-border/40 bg-background/60 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/20 pb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Original Video</span>
                  <span className="text-[10px] font-mono bg-foreground/10 px-2 py-0.5 rounded text-foreground font-semibold">BEFORE</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground text-xs">File Size</span>
                    <span className="font-bold text-foreground text-base">145.2 MB</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Resolution</span>
                    <span className="font-medium text-foreground">1920x1080</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Codec</span>
                    <span className="font-medium text-foreground">H.264</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Bitrate</span>
                    <span className="font-medium text-foreground">18.4 Mbps</span>
                  </div>
                </div>
              </div>

              {/* CENTER RATIO INDICATOR */}
              <div className="md:col-span-1 flex flex-col items-center justify-center py-2 md:py-0">
                <div className="h-9 w-9 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ArrowRight className="h-4 w-4 hidden md:block" />
                  <ArrowDown className="h-4 w-4 md:hidden" />
                </div>
                <span className="mt-1.5 text-[11px] font-extrabold text-emerald-400 font-mono tracking-tight text-center">
                  93.7% SMALLER
                </span>
              </div>

              {/* COMPRESSED VIDEO */}
              <div className="md:col-span-5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.03] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Compressed Video</span>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">AFTER</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground text-xs">File Size</span>
                    <span className="font-bold text-emerald-400 text-base">9.2 MB</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Resolution</span>
                    <span className="font-medium text-foreground">1920x1080</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Codec</span>
                    <span className="font-medium text-foreground">H.264</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Space Saved</span>
                    <span className="font-bold text-emerald-400">136.0 MB Saved</span>
                  </div>
                </div>
              </div>

            </div>

            <p className="mt-5 text-center text-[11px] text-muted-foreground/60">
              * Example compression benchmark for standard 1080p video encoded using the Balanced preset.
            </p>

          </div>

        </div>
      </section>


      {/* ==========================================
          6. SUPPORTED FORMATS STRIP
         ========================================== */}
      <section className="py-8 border-b border-border/20 bg-foreground/[0.002]">
        <div className="desktop-container text-center space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 block">
            SUPPORTED FORMATS
          </span>
          <div className="flex items-center justify-center gap-3">
            {["MP4", "MOV", "AVI", "MKV"].map((fmt) => (
              <span 
                key={fmt}
                className="inline-flex items-center space-x-1.5 rounded-lg border border-border/40 bg-card px-3.5 py-1.5 text-xs font-mono font-bold text-foreground hover:border-border/80 hover:-translate-y-0.5 transition-all duration-200 transform-gpu shadow-xs"
              >
                <Film className="h-3 w-3 text-muted-foreground" />
                <span>{fmt}</span>
              </span>
            ))}
          </div>
        </div>
      </section>


      {/* ==========================================
          7. PRIVACY SECTION
         ========================================== */}
      <section className="py-14 md:py-20 border-b border-border/20">
        <div className="desktop-container">
          
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Your videos stay yours.
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Compress videos with a privacy-focused workflow without relying on unnecessary third-party cloud storage.
            </p>
          </div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <motion.div 
              variants={itemVariants}
              className="group rounded-xl border border-border/40 bg-card p-5 glass flex flex-col items-start space-y-2.5 hover:border-border/80 hover:-translate-y-1 transition-all duration-200 transform-gpu shadow-sm hover:shadow-md"
            >
              <div className="h-9 w-9 rounded-lg bg-foreground/5 border border-border/30 flex items-center justify-center text-foreground group-hover:scale-105 group-hover:bg-foreground/10 transition-all duration-200">
                <Lock className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Privacy First</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your files are handled through the designed processing workflow.
              </p>
            </motion.div>

            <motion.div 
              variants={itemVariants}
              className="group rounded-xl border border-border/40 bg-card p-5 glass flex flex-col items-start space-y-2.5 hover:border-border/80 hover:-translate-y-1 transition-all duration-200 transform-gpu shadow-sm hover:shadow-md"
            >
              <div className="h-9 w-9 rounded-lg bg-foreground/5 border border-border/30 flex items-center justify-center text-foreground group-hover:scale-105 group-hover:bg-foreground/10 transition-all duration-200">
                <Zap className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Fast Processing</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                FFmpeg-powered compression.
              </p>
            </motion.div>

            <motion.div 
              variants={itemVariants}
              className="group rounded-xl border border-border/40 bg-card p-5 glass flex flex-col items-start space-y-2.5 hover:border-border/80 hover:-translate-y-1 transition-all duration-200 transform-gpu shadow-sm hover:shadow-md"
            >
              <div className="h-9 w-9 rounded-lg bg-foreground/5 border border-border/30 flex items-center justify-center text-foreground group-hover:scale-105 group-hover:bg-foreground/10 transition-all duration-200">
                <Trash2 className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Controlled Storage</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Temporary processing files are cleaned up appropriately.
              </p>
            </motion.div>
          </motion.div>

        </div>
      </section>


      {/* ==========================================
          8. TECHNOLOGY SECTION
         ========================================== */}
      <section className="py-12 md:py-16 border-b border-border/20 bg-foreground/[0.002]">
        <div className="desktop-container text-center space-y-6">
          
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Built with powerful open technology.
          </h3>

          <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-2xl mx-auto">
            {[
              { name: "React", icon: Code2 },
              { name: "FastAPI", icon: Server },
              { name: "Python", icon: Layers },
              { name: "FFmpeg", icon: Cpu },
              { name: "SQLite", icon: Database },
              { name: "Docker", icon: Box },
            ].map((tech, idx) => {
              const TechIcon = tech.icon;
              return (
                <div
                  key={idx}
                  className="flex items-center space-x-2 rounded-lg border border-border/40 bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground/90 hover:border-border/80 hover:bg-foreground/5 hover:-translate-y-0.5 transition-all duration-200 transform-gpu cursor-default"
                >
                  <TechIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{tech.name}</span>
                </div>
              );
            })}
          </div>

        </div>
      </section>


      {/* ==========================================
          9. FINAL CTA SECTION
         ========================================== */}
      <section className="py-20 md:py-28 text-center relative overflow-hidden">
        <motion.div 
          className="desktop-container relative z-10 flex flex-col items-center space-y-5"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground max-w-xl leading-tight">
            Ready to compress your videos?
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-sm mx-auto">
            Compress your first video with Compressly.
          </p>
          <button
            onClick={startApp}
            className="group inline-flex items-center space-x-2.5 rounded-xl bg-foreground px-7 py-3.5 font-semibold text-background dark:bg-foreground dark:text-background hover:opacity-95 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-md hover:shadow-lg text-sm transform-gpu"
          >
            <span>Launch Compressly</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
          </button>
        </motion.div>
      </section>

    </div>
  );
};
