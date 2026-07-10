import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  Clock3,
  Command,
  Loader2,
  Mic,
  PanelBottom,
  Pause,
  Play,
  Settings2,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Avatar } from './ui/Avatar';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/Card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/Dialog';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { SegmentedControl } from './ui/SegmentedControl';
import { Skeleton } from './ui/Skeleton';
import { Switch } from './ui/Switch';
import { Textarea } from './ui/Textarea';

const reveal = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring', stiffness: 220, damping: 30 },
} as const;

const foundations = [
  ['Control', '48px', 'Altura padrão para botões e campos.'],
  ['Compact', '44px', 'Mínimo para ações secundárias.'],
  ['Card padding', '24px', 'Respiro interno padrão.'],
  ['Grid gap', '20px', 'Separação entre componentes irmãos.'],
  ['Section gap', '72-112px', 'Distância entre blocos do showcase.'],
  ['Radius', '8px', 'Cantos precisos e consistentes.'],
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <motion.section {...reveal} className="voxa-section">
      <div className="voxa-section-header">
        <h2 className="text-title-2 text-white">{title}</h2>
        <p className="text-body max-w-[56ch] text-white/60">{description}</p>
      </div>
      {children}
    </motion.section>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card variant="quiet">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-mono tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-footnote text-white/60">{detail}</p>
      </CardContent>
    </Card>
  );
}

function InlineMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-5">
      <p className="text-footnote text-white/50">{label}</p>
      <p className="mt-2 font-mono text-[22px] font-semibold leading-none text-white tabular-nums">{value}</p>
      <p className="text-footnote mt-3 text-white/60">{detail}</p>
    </div>
  );
}

function Field({
  id,
  label,
  children,
  helper,
}: {
  id: string;
  label: string;
  children: ReactNode;
  helper?: ReactNode;
}) {
  return (
    <div className="voxa-field">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {helper}
    </div>
  );
}

export default function ComponentsShowcase() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [switchOn, setSwitchOn] = useState(true);
  const [recordingMode, setRecordingMode] = useState('meeting');

  return (
    <main className="voxa-page">
      <motion.header {...reveal} className="grid gap-8 pb-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
        <div>
          <Badge variant="secondary">
            <Sparkles />
            2050 Minimalist
          </Badge>
          <h1 className="mt-6 max-w-[13ch] text-[52px] font-medium leading-[1.02] text-white sm:text-[64px]">
            Voxa UI kit
          </h1>
          <p className="text-body mt-5 max-w-[58ch] text-white/60">
            Componentes isolados para a plataforma. Espaço, proporção e estados antes de decoração.
          </p>
        </div>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Mode control</CardTitle>
            <CardDescription>Controle segmentado com área de toque real e alinhamento óptico.</CardDescription>
          </CardHeader>
          <CardContent>
            <SegmentedControl
              aria-label="Recording mode"
              value={recordingMode}
              onValueChange={setRecordingMode}
              options={[
                { value: 'meeting', label: 'Meeting', icon: <Command /> },
                { value: 'voice', label: 'Voice', icon: <Mic /> },
                { value: 'review', label: 'Review', icon: <ShieldCheck /> },
              ]}
            />
          </CardContent>
        </Card>
      </motion.header>

      <Section
        title="Foundations"
        description="A régua base que os componentes devem obedecer antes de qualquer variação visual."
      >
        <div className="voxa-showcase-grid">
          {foundations.map(([label, value, detail]) => (
            <MetricCard key={label} label={label} value={value} detail={detail} />
          ))}
        </div>
      </Section>

      <Section
        title="Buttons"
        description="Ações com altura consistente, texto legível, ícones alinhados e resposta tátil."
      >
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Use uma intenção por label. Botão primário só para o próximo passo claro.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary">
                <Play />
                Start
              </Button>
              <Button variant="secondary">
                <Pause />
                Pause
              </Button>
              <Button variant="outline">
                <Settings2 />
                Configure
              </Button>
              <Button variant="destructive">
                <AlertTriangle />
                Stop
              </Button>
              <Button variant="ghost">Dismiss</Button>
              <Button variant="link">View details</Button>
              <Button variant="icon" size="icon" aria-label="Quick recording">
                <Mic />
              </Button>
              <Button variant="secondary" disabled>
                <Loader2 className="animate-spin" />
                Processing
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <InlineMetric label="Default" value="48px" detail="Ação principal e secundária." />
              <InlineMetric label="Small" value="44px" detail="Denso, mas ainda acessível." />
              <InlineMetric label="Icon" value="48x48" detail="Ícone isolado com aria-label." />
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section
        title="Forms"
        description="Campos com label acima, helper abaixo e distância suficiente para leitura rápida."
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardHeader>
              <CardTitle>Transcript setup</CardTitle>
              <CardDescription>Estrutura padrão para formulários curtos da plataforma.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <Field id="meeting-title" label="Title">
                <Input id="meeting-title" placeholder="Weekly product review" />
              </Field>
              <Field id="speaker-email" label="Owner email">
                <Input id="speaker-email" type="email" placeholder="name@company.com" />
              </Field>
              <Field
                id="invalid-token"
                label="Connection token"
                helper={<p className="text-footnote text-danger">Generate a new restricted token before continuing.</p>}
              >
                <Input id="invalid-token" error placeholder="Token expired" />
              </Field>
              <Field id="meeting-notes" label="Context">
                <Textarea id="meeting-notes" placeholder="Decision points, participants and open questions." />
              </Field>
            </CardContent>
          </Card>

          <div className="grid content-start gap-5">
            <Card variant="interactive">
              <CardHeader>
                <CardTitle>Auto-process</CardTitle>
                <CardDescription>Transcribe and summarize after stop.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-white/[0.055] text-primary">
                  <Zap className="h-5 w-5" />
                </div>
                <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Avatar scale</CardTitle>
                <CardDescription>Squircle, não bolinha genérica.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-end gap-4">
                <Avatar size="sm" src="https://i.pravatar.cc/150?u=voxa-a" alt="User" />
                <Avatar size="md" alt="Luiz Neto" />
                <Avatar size="lg" alt="Voxa" fallback="V" />
                <Avatar size="xl" alt="AI" fallback="AI" />
              </CardContent>
            </Card>
          </div>
        </div>
      </Section>

      <Section
        title="Feedback"
        description="Estados claros, sem enfeite solto. Skeleton segue a forma do conteúdo final."
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Semantic badges</CardTitle>
              <CardDescription>Status pequenos, com cor só quando comunica estado real.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Badge variant="primary">New</Badge>
              <Badge variant="secondary">Queued</Badge>
              <Badge variant="success">
                <Check />
                Complete
              </Badge>
              <Badge variant="warning">
                <Clock3 />
                Waiting
              </Badge>
              <Badge variant="danger">Failed</Badge>
              <Badge variant="outline">Draft</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Loading state</CardTitle>
              <CardDescription>Blocos preservam tamanho e evitam salto visual.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="grid flex-1 gap-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-28 w-full" />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section
        title="Surfaces"
        description="Três níveis, cada um com função clara. Sem cards dentro de cards."
      >
        <div className="grid gap-5 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Default</CardTitle>
              <CardDescription>Conteúdo de leitura recorrente.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-body text-white/70">Superfície base com padding confortável e contraste estável.</p>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Overlay</CardTitle>
              <CardDescription>Overlays e decisões de maior peso.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="secondary" className="w-full">Review</Button>
            </CardFooter>
          </Card>
          <Card variant="interactive">
            <CardHeader>
              <CardTitle>Interactive</CardTitle>
              <CardDescription>Selecionável, com resposta física.</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="success">Ready</Badge>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section
        title="Overlays"
        description="Dialog como sheet no mobile e modal no desktop, com padding próprio."
      >
        <Card variant="quiet">
          <CardHeader>
            <CardTitle>Modal action</CardTitle>
            <CardDescription>O conteúdo do overlay mantém a mesma escala dos cards.</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary">
                  <PanelBottom />
                  Open sheet
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Finalize recording</DialogTitle>
                  <DialogDescription>
                    Voxa keeps the transcript available while it generates the summary and action items.
                  </DialogDescription>
                </DialogHeader>
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
                  <p className="text-body font-mono tabular-nums text-white/75">00:42:18 captured from microphone and system audio.</p>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button variant="primary" onClick={() => setIsDialogOpen(false)}>
                    <Check />
                    Finalize
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </Section>
    </main>
  );
}
