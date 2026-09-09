import { eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "../../../db";
import { siteSamples } from "../../../db/schema";
import { Clock3, MapPin, MessageCircleMore, Phone, ShieldCheck, Sparkles } from "lucide-react";
import "./sample.css";

export const dynamic = "force-dynamic";

export default async function SamplePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  const [sample] = await db.select().from(siteSamples).where(eq(siteSamples.slug, slug)).limit(1);
  if (!sample) notFound();
  await db.update(siteSamples).set({ views: sql`${siteSamples.views} + 1` }).where(eq(siteSamples.id, sample.id));
  const digits = sample.phone.replace(/\D/g, "");
  const whats = digits ? `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}` : "#contato";
  const services = ["Atendimento especializado", "Orçamento rápido", "Soluções sob medida"];
  return (
    <main className="sample-site" style={{ "--brand": sample.primaryColor } as React.CSSProperties}>
      <div className="demo-ribbon">AMOSTRA DEMONSTRATIVA · NÃO É O SITE OFICIAL</div>
      <header><strong>{sample.companyName}</strong><a href={whats} target="_blank">Falar no WhatsApp</a></header>
      <section className="hero"><div><span>{sample.segment}</span><h1>Qualidade e confiança para atender você em {sample.city.split("-")[0]}.</h1><p>Conheça nossas soluções e solicite um atendimento de forma rápida e direta.</p><a className="cta" href={whats} target="_blank"><MessageCircleMore/> Solicitar orçamento</a></div><div className="hero-card"><Sparkles/><strong>Atendimento que resolve</strong><p>Uma presença digital clara, profissional e pronta para transformar visitas em novos contatos.</p></div></section>
      <section className="services"><div className="section-title"><span>NOSSOS DIFERENCIAIS</span><h2>Como podemos ajudar</h2></div><div className="service-grid">{services.map((service, index) => <article key={service}>{index === 0 ? <ShieldCheck/> : index === 1 ? <Clock3/> : <Sparkles/>}<h3>{service}</h3><p>Conte com uma equipe preparada para entender sua necessidade e oferecer a melhor solução.</p></article>)}</div></section>
      <section className="contact" id="contato"><div><span>FALE CONOSCO</span><h2>Pronto para solicitar um orçamento?</h2><p>Entre em contato e receba mais informações.</p></div><div>{sample.phone && <p><Phone/> {sample.phone}</p>}{sample.address && <p><MapPin/> {sample.address}</p>}<a className="cta" href={whats} target="_blank">Abrir WhatsApp</a></div></section>
      <footer><strong>{sample.companyName}</strong><span>Site demonstrativo criado para apresentação comercial.</span></footer>
    </main>
  );
}
