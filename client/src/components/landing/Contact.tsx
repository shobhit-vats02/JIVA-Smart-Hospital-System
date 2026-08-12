'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Mail, Phone, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export function Contact() {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    // Client prototype contact submission. Persisted flows land in later milestones.
    setTimeout(() => {
      setSending(false);
      setForm({ name: '', email: '', message: '' });
      toast('success', 'Message sent', 'Our team will reach out shortly.');
    }, 900);
  };

  return (
    <section className="px-6 py-24" id="contact">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="badge badge-primary mb-5"
            >
              Contact
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl font-bold"
            >
              Let's build <span className="text-gradient">the future of care</span>
            </motion.h2>
            <div className="mt-8 space-y-4">
              {[
                { icon: Mail, text: 'hello@jiva.ai' },
                { icon: Phone, text: '+91 90000 00000' },
                { icon: MapPin, text: 'JIVA Medical Hub, Ahmedabad, India' },
              ].map((c) => (
                <div key={c.text} className="glass flex items-center gap-3 px-4 py-3">
                  <c.icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{c.text}</span>
                </div>
              ))}
            </div>
          </div>

          <motion.form
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            onSubmit={submit}
            className="glass glow-border space-y-4 p-7 shadow-glass"
          >
            <Input label="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Jane Doe" />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="you@example.com" />
            <div className="w-full">
              <label className="mb-1.5 block text-sm font-medium text-ink-2">Message</label>
              <textarea
                className="input min-h-[120px] resize-none"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
                placeholder="How can we help?"
              />
            </div>
            <Button type="submit" loading={sending} className="w-full" leftIcon={<Send className="h-4 w-4" />}>
              Send message
            </Button>
          </motion.form>
        </div>
      </div>
    </section>
  );
}
