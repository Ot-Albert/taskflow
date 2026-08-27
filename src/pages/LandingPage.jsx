import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTheme } from "../hooks/useTheme";

// Framer Motion variants for staggered reveals.
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const features = [
  {
    icon: "✓",
    title: "Full task management",
    desc: "Create, edit, delete, filter, and sort your tasks with an intuitive interface.",
  },
  {
    icon: "⚡",
    title: "Smart filtering",
    desc: "Filter by status and priority, search by keyword, and sort by due date or priority.",
  },
  {
    icon: "↕",
    title: "Drag & drop",
    desc: "Reorder tasks with drag-and-drop or keyboard arrows. Your order persists automatically.",
  },
  {
    icon: "☾",
    title: "Dark & light modes",
    desc: "A refined gold-and-black theme in both modes. Follows your system preference by default.",
  },
  {
    icon: "↓",
    title: "Export anytime",
    desc: "Download your tasks as JSON or CSV. Your data is always yours to take.",
  },
  {
    icon: "🔒",
    title: "Secure & private",
    desc: "Your tasks are tied to your account and stored securely. Sign in to access them anywhere.",
  },
];

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="landing">
      {/* Nav */}
      <motion.nav
        className="landing__nav"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="landing__nav-brand">
          <span className="landing__logo" aria-hidden="true">✓</span>
          <span className="landing__nav-title">TaskFlow</span>
        </div>
        <div className="landing__nav-actions">
          <button
            type="button"
            className="icon-btn theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <Link to="/login" className="btn btn--ghost">
            Sign in
          </Link>
          <Link to="/signup" className="btn btn--primary">
            Get started
          </Link>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="landing__hero">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="landing__hero-content"
        >
          <motion.span variants={item} className="landing__badge">
            ✦ Your personal task manager
          </motion.span>
          <motion.h1 variants={item} className="landing__hero-title">
            Stay organised.
            <br />
            <span className="landing__hero-title-accent">Get things done.</span>
          </motion.h1>
          <motion.p variants={item} className="landing__hero-subtitle">
            TaskFlow is a clean, fast, and beautiful way to manage your personal
            tasks. Filter, sort, search, and export — all in one place.
          </motion.p>
          <motion.div variants={item} className="landing__hero-cta">
            <Link to="/signup" className="btn btn--primary btn--large">
              Create your account →
            </Link>
            <Link to="/login" className="btn btn--ghost btn--large">
              I already have one
            </Link>
          </motion.div>
        </motion.div>

        {/* Floating preview card */}
        <motion.div
          className="landing__preview"
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="preview-card">
            <div className="preview-card__header">
              <span className="badge badge--status">To Do</span>
              <span className="badge badge--priority badge--high">High</span>
            </div>
            <h3 className="preview-card__title">Finish project proposal</h3>
            <p className="preview-card__desc">Draft the Q3 roadmap and share with the team for review.</p>
            <span className="preview-card__due">Due Aug 28, 2026</span>
          </div>
          <motion.div
            className="preview-card preview-card--offset"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <div className="preview-card__header">
              <span className="badge badge--in-progress">In Progress</span>
              <span className="badge badge--priority badge--medium">Medium</span>
            </div>
            <h3 className="preview-card__title">Review pull requests</h3>
            <p className="preview-card__desc">3 PRs waiting for review on the auth feature.</p>
            <span className="preview-card__due">Due Aug 30, 2026</span>
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="landing__features">
        <motion.h2
          className="landing__section-title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          Everything you need to stay on track
        </motion.h2>
        <motion.div
          className="landing__features-grid"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={item} className="feature-card">
              <span className="feature-card__icon" aria-hidden="true">
                {f.icon}
              </span>
              <h3 className="feature-card__title">{f.title}</h3>
              <p className="feature-card__desc">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <motion.section
        className="landing__cta"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="landing__cta-title">Ready to take control of your tasks?</h2>
        <p className="landing__cta-subtitle">
          Join TaskFlow today. It's free, fast, and your data stays yours.
        </p>
        <Link to="/signup" className="btn btn--primary btn--large">
          Get started for free →
        </Link>
      </motion.section>

      {/* Footer */}
      <footer className="landing__footer">
        <p>TaskFlow — a personal task manager. Data is protected.</p>
      </footer>
    </div>
  );
}
