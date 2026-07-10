import { useState } from 'react';
import { Check, Mic, Pause, Settings2, Sparkles, Trash2 } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { SegmentedControl } from './ui/SegmentedControl';
import { Skeleton } from './ui/Skeleton';
import { Switch } from './ui/Switch';
import { Textarea } from './ui/Textarea';

const foundations = [
  ['Control', '44px', 'Área interativa mínima em toda a plataforma.'],
  ['Grid', '8px', 'Base para padding, gaps e alinhamentos.'],
  ['Page padding', '24px', 'Respiro padrão na janela 1024×768.'],
  ['Compact', '16px', 'Padding usado no fallback 800×600.'],
  ['Radius', '8–12px', 'Cantos discretos e consistentes.'],
  ['Palette', 'Neutral', 'Cor aparece apenas para estado semântico.'],
];

export default function ComponentsShowcase() {
  const [mode, setMode] = useState('meeting');
  const [enabled, setEnabled] = useState(true);

  return (
    <main className="voxa-page">
      <header style={{ display: 'grid', gap: 12, maxWidth: 720 }}>
        <Badge variant="outline"><Sparkles /> Light workspace system</Badge>
        <h1 className="text-large-title" style={{ margin: 0, fontWeight: 720, letterSpacing: '-0.045em' }}>Voxa UI kit</h1>
        <p className="text-body" style={{ margin: 0, color: 'var(--text-secondary)' }}>
          Bancada interna para validar proporção, contraste, espaçamento e estados antes de levar componentes ao produto.
        </p>
      </header>

      <section className="voxa-section">
        <div className="voxa-section-header"><h2 className="text-title-2">Foundations</h2><p className="text-body">Uma régua simples, previsível e responsiva.</p></div>
        <div className="voxa-showcase-grid">
          {foundations.map(([label, value, detail]) => (
            <Card variant="quiet" key={label}>
              <CardHeader><CardDescription>{label}</CardDescription><CardTitle style={{ fontSize: 22 }}>{value}</CardTitle></CardHeader>
              <CardContent><p className="text-footnote" style={{ margin: 0, color: 'var(--text-secondary)' }}>{detail}</p></CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="voxa-section">
        <div className="voxa-section-header"><h2 className="text-title-2">Actions</h2><p className="text-body">Uma intenção clara por botão, com estados semânticos.</p></div>
        <Card>
          <CardHeader><CardTitle>Buttons</CardTitle><CardDescription>Primário preto, superfícies neutras e perigo explícito.</CardDescription></CardHeader>
          <CardContent style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Button><Mic />Start recording</Button>
            <Button variant="secondary"><Pause />Pause</Button>
            <Button variant="outline"><Settings2 />Settings</Button>
            <Button variant="destructive"><Trash2 />Delete</Button>
            <Button variant="ghost"><Check />Done</Button>
          </CardContent>
        </Card>
      </section>

      <section className="voxa-section">
        <div className="voxa-section-header"><h2 className="text-title-2">Forms and controls</h2><p className="text-body">Labels visíveis, foco claro e altura consistente.</p></div>
        <div className="voxa-showcase-grid">
          <Card>
            <CardHeader><CardTitle>Conversation setup</CardTitle><CardDescription>Campos curtos para preparar a captura.</CardDescription></CardHeader>
            <CardContent style={{ display: 'grid', gap: 14 }}>
              <div className="voxa-field"><Label htmlFor="title">Title</Label><Input id="title" placeholder="Weekly product review" /></div>
              <div className="voxa-field"><Label htmlFor="context">Context</Label><Textarea id="context" placeholder="Participants, decisions, and open questions." /></div>
            </CardContent>
            <CardFooter><Button>Save</Button><Button variant="secondary">Cancel</Button></CardFooter>
          </Card>
          <Card variant="quiet">
            <CardHeader><CardTitle>Preferences</CardTitle><CardDescription>Controles compactos sem perder acessibilidade.</CardDescription></CardHeader>
            <CardContent style={{ display: 'grid', gap: 18 }}>
              <SegmentedControl aria-label="Recording mode" value={mode} onValueChange={setMode} options={[{ value: 'meeting', label: 'Meeting' }, { value: 'voice', label: 'Voice' }]} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><span className="text-subhead">Auto-process after save</span><Switch checked={enabled} onCheckedChange={setEnabled} /></div>
              <Skeleton style={{ height: 54 }} />
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
