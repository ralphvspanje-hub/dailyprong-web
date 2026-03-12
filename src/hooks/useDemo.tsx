import { createContext, useContext, useState, ReactNode } from "react";

interface DemoContextType {
  isDemo: boolean;
  enableDemo: () => void;
  disableDemo: () => void;
}

const DemoContext = createContext<DemoContextType>({
  isDemo: false,
  enableDemo: () => {},
  disableDemo: () => {},
});

export const DemoProvider = ({ children }: { children: ReactNode }) => {
  const [isDemo, setIsDemo] = useState(false);
  return (
    <DemoContext.Provider value={{ isDemo, enableDemo: () => setIsDemo(true), disableDemo: () => setIsDemo(false) }}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => useContext(DemoContext);

// ─── Mock Data ───

export const DEMO_PILLARS = [
  { id: "p1", name: "Systems Thinking", description: "Understanding complex adaptive systems and feedback loops", why_it_matters: "Essential for architectural decisions", current_level: 3, starting_level: 2, is_active: true, sort_order: 0, phase_weight: 30, trend: "up", created_at: "2026-01-01", last_difficulty_signal: null },
  { id: "p2", name: "Technical Leadership", description: "Leading engineering teams and driving technical vision", why_it_matters: "Key to career growth", current_level: 2, starting_level: 1, is_active: true, sort_order: 1, phase_weight: 25, trend: "up", created_at: "2026-01-01", last_difficulty_signal: null },
  { id: "p3", name: "Distributed Systems", description: "Designing reliable, scalable distributed architectures", why_it_matters: "Core infrastructure competency", current_level: 2, starting_level: 2, is_active: true, sort_order: 2, phase_weight: 25, trend: "stable", created_at: "2026-01-01", last_difficulty_signal: null },
  { id: "p4", name: "Product Sense", description: "Connecting technical work to business outcomes", why_it_matters: "Bridges engineering and strategy", current_level: 1, starting_level: 1, is_active: true, sort_order: 3, phase_weight: 20, trend: "up", created_at: "2026-01-01", last_difficulty_signal: null },
];

export const DEMO_CYCLES = [
  { id: "c1", cycle_number: 1, user_id: "demo", pillar_id: "p1", status: "completed", theme: "Feedback Loops in Software", started_at: "2026-01-15", completed_at: "2026-01-20", bridge_count: 0, pillars: { name: "Systems Thinking" } },
  { id: "c2", cycle_number: 2, user_id: "demo", pillar_id: "p2", status: "completed", theme: "Running Effective Design Reviews", started_at: "2026-01-22", completed_at: "2026-01-28", bridge_count: 0, pillars: { name: "Technical Leadership" } },
  { id: "c3", cycle_number: 3, user_id: "demo", pillar_id: "p3", status: "completed", theme: "CAP Theorem in Practice", started_at: "2026-02-01", completed_at: "2026-02-07", bridge_count: 1, pillars: { name: "Distributed Systems" } },
  { id: "c4", cycle_number: 4, user_id: "demo", pillar_id: "p1", status: "active", theme: "Emergent Behavior in Microservices", started_at: "2026-02-10", completed_at: null, bridge_count: 0, pillars: { name: "Systems Thinking" } },
];

export const DEMO_UNITS = [
  {
    id: "u1", cycle_id: "c1", pillar_id: "p1", section_number: 1, section_type: "concept", topic: "What Are Feedback Loops?",
    difficulty_level: 2, is_bridge: false, is_bonus: false, is_pending_feedback: false,
    feedback_difficulty: "about_right", feedback_value: "high", feedback_note: null, feedback_given_at: "2026-01-16",
    content: "# Feedback Loops in Systems\n\nA **feedback loop** occurs when the output of a system is routed back as input...\n\n## Positive vs Negative Feedback\n\n- **Positive feedback** amplifies change\n- **Negative feedback** dampens change and promotes stability\n\n## In Software\n\nMonitoring → Alerting → Response → Monitoring is a classic negative feedback loop.",
    created_at: "2026-01-15", file_path_equivalent: null, bridge_prerequisite_for: null,
    cycles: { user_id: "demo", theme: "Feedback Loops in Software", cycle_number: 1, pillar_id: "p1", pillars: { name: "Systems Thinking" } },
  },
  {
    id: "u2", cycle_id: "c2", pillar_id: "p2", section_number: 1, section_type: "case_study", topic: "Google's Design Review Process",
    difficulty_level: 3, is_bridge: false, is_bonus: false, is_pending_feedback: false,
    feedback_difficulty: "about_right", feedback_value: "high", feedback_note: "Very practical", feedback_given_at: "2026-01-23",
    content: "# Case Study: Design Reviews at Google\n\nGoogle's design review process emphasizes...\n\n## Key Takeaways\n\n1. Keep reviews focused on architecture, not code style\n2. Involve cross-team stakeholders early\n3. Document decisions and their rationale",
    created_at: "2026-01-22", file_path_equivalent: null, bridge_prerequisite_for: null,
    cycles: { user_id: "demo", theme: "Running Effective Design Reviews", cycle_number: 2, pillar_id: "p2", pillars: { name: "Technical Leadership" } },
  },
  {
    id: "u3", cycle_id: "c3", pillar_id: "p3", section_number: 1, section_type: "deep_dive", topic: "Understanding the CAP Theorem",
    difficulty_level: 4, is_bridge: false, is_bonus: false, is_pending_feedback: false,
    feedback_difficulty: "too_hard", feedback_value: "medium", feedback_note: null, feedback_given_at: "2026-02-02",
    content: "# The CAP Theorem\n\nIn distributed systems, you can only guarantee two of three properties...\n\n## Consistency\nEvery read returns the most recent write.\n\n## Availability\nEvery request receives a response.\n\n## Partition Tolerance\nThe system continues despite network partitions.",
    created_at: "2026-02-01", file_path_equivalent: null, bridge_prerequisite_for: null,
    cycles: { user_id: "demo", theme: "CAP Theorem in Practice", cycle_number: 3, pillar_id: "p3", pillars: { name: "Distributed Systems" } },
  },
];

export const DEMO_PENDING_UNIT = {
  id: "u4", cycle_id: "c4", pillar_id: "p1", section_number: 1, section_type: "concept", topic: "Emergent Behavior in Microservice Architectures",
  difficulty_level: 3, is_bridge: false, is_bonus: false, is_pending_feedback: true,
  feedback_difficulty: null, feedback_value: null, feedback_note: null, feedback_given_at: null,
  content: "# Emergent Behavior in Microservices\n\nWhen individual services follow simple rules, the **overall system** can exhibit complex, unexpected behaviors. This is called **emergence**.\n\n## Why It Matters\n\nEmergent behavior is often the root cause of:\n- Cascading failures\n- Unexpected latency spikes\n- Resource contention patterns\n\n## Recognizing Emergence\n\nLook for behaviors that:\n1. No single service is responsible for\n2. Only appear under specific load patterns\n3. Cannot be predicted from individual service specifications\n\n## Strategies for Management\n\n- **Observability**: Distributed tracing reveals emergent patterns\n- **Chaos Engineering**: Deliberately introduce faults to surface hidden behaviors\n- **Circuit Breakers**: Contain cascading effects\n- **Load Shedding**: Graceful degradation under pressure\n\n## Practical Exercise\n\nMap your current architecture. Identify three points where emergent behavior could arise. For each, describe what monitoring you'd need to detect it early.",
  cycle_theme: "Emergent Behavior in Microservices",
  pillar_name: "Systems Thinking",
  created_at: "2026-02-10", file_path_equivalent: null, bridge_prerequisite_for: null,
};

export const DEMO_PROFILE = {
  id: "demo-profile",
  user_id: "demo",
  name: "Alex",
  current_role: "Senior Software Engineer",
  target_role: "Staff Engineer",
  long_term_ambition: "Become a technical leader who shapes architecture at scale",
  daily_time_commitment: 20,
  learning_cadence: "daily",
  cycle_length: 5,
  learning_style: "conceptual",
  unique_differentiator: null,
  mentor_name: "Sage",
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

export const DEMO_MENTOR_MESSAGES = [
  { id: "m1", role: "assistant", content: "Hey Alex! I'm Sage, your DailyProng mentor. I know your pillars, your progress, and where you're headed. What's on your mind today?", created_at: "2026-02-10T10:00:00Z" },
];