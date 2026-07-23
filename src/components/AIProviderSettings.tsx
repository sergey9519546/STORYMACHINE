import { useState, useEffect } from 'react';

interface AIProviderOption {
  id: string;
  name: string;
  tier: 'free' | 'premium';
  available: boolean;
  description: string[];
  setupUrl?: string;
  requiresKey: boolean;
}

interface AIProviderSettingsProps {
  onProviderChange?: (providerId: string) => void;
}

export function AIProviderSettings({ onProviderChange }: AIProviderSettingsProps) {
  const [currentProvider, setCurrentProvider] = useState<string>('gemini');
  const [availableProviders, setAvailableProviders] = useState<AIProviderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  // Define provider catalog with free vs premium tiers
  const providerCatalog: AIProviderOption[] = [
    {
      id: 'openrouter-free',
      name: 'FreeRide (OpenRouter Free Models)',
      tier: 'free',
      available: false, // Will be checked from server
      description: [
        '✓ 30+ models from Google, Meta, Mistral, DeepSeek',
        '✓ Automatic failover on rate limits',
        '✓ Zero cost',
        '✓ No credit card required',
      ],
      setupUrl: 'https://openrouter.ai/keys',
      requiresKey: true,
    },
    {
      id: 'gemini',
      name: 'Google Gemini (Premium)',
      tier: 'premium',
      available: false, // Will be checked from server
      description: [
        '✓ Gemini 2.5 Pro & Flash models',
        '✓ 1M+ token context window',
        '✓ Multimodal (text, image, audio)',
        '✓ Requires GEMINI_API_KEY',
      ],
      requiresKey: true,
    },
    {
      id: 'openai',
      name: 'OpenAI (Premium)',
      tier: 'premium',
      available: false,
      description: [
        '✓ GPT-4o, GPT-4 Turbo models',
        '✓ Best-in-class reasoning',
        '✓ Vision & function calling',
        '✓ Requires OpenAI API key',
      ],
      requiresKey: true,
    },
    {
      id: 'anthropic',
      name: 'Anthropic Claude (Premium)',
      tier: 'premium',
      available: false,
      description: [
        '✓ Claude 3.5 Sonnet',
        '✓ 200K token context',
        '✓ Excellent instruction following',
        '✓ Requires Anthropic API key',
      ],
      requiresKey: true,
    },
  ];

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-providers');
      if (res.ok) {
        const data = await res.json() as { providers: Array<{ id: string; available: boolean }>; current: string };
        
        // Merge server availability with catalog
        const merged = providerCatalog.map(p => ({
          ...p,
          available: data.providers.find(sp => sp.id === p.id)?.available ?? false,
        }));
        
        setAvailableProviders(merged);
        setCurrentProvider(data.current);
      } else {
        // Fallback to catalog if endpoint doesn't exist yet
        setAvailableProviders(providerCatalog);
      }
    } catch (error) {
      console.warn('Could not fetch providers, using defaults:', error);
      setAvailableProviders(providerCatalog);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSwitch = async (providerId: string) => {
    if (providerId === currentProvider || switching) return;

    setSwitching(true);
    try {
      const res = await fetch('/api/ai-providers/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      });

      if (res.ok) {
        setCurrentProvider(providerId);
        onProviderChange?.(providerId);
      } else {
        const error = await res.json().catch(() => ({ error: 'Failed to switch provider' })) as { error: string };
        alert(error.error || 'Failed to switch provider');
      }
    } catch (error) {
      alert('Network error: ' + (error as Error).message);
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm font-mono text-gray-500">Loading providers…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-bold uppercase tracking-widest">AI Provider Selection</h3>
        <p className="text-xs text-gray-500 font-mono leading-relaxed">
          Choose between free models (OpenRouter) or premium providers (Gemini, OpenAI, Claude).
          Free tier is perfect for getting started with no API key required.
        </p>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 gap-4">
        {availableProviders.map((provider) => (
          <button
            key={provider.id}
            onClick={() => handleProviderSwitch(provider.id)}
            disabled={switching || !provider.available}
            className={`
              relative border-4 p-4 text-left transition-all
              ${currentProvider === provider.id
                ? 'border-black bg-[var(--sm-ink)] text-white'
                : provider.available
                  ? 'border-black bg-white hover:bg-gray-50'
                  : 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-60'
              }
              ${switching ? 'cursor-wait' : ''}
            `}
          >
            {/* Tier Badge */}
            <div className="absolute top-3 right-3">
              <span
                className={`
                  px-2 py-1 text-[10px] font-bold uppercase tracking-widest border-2
                  ${provider.tier === 'free'
                    ? 'bg-green-100 text-green-800 border-green-800'
                    : 'bg-yellow-100 text-yellow-900 border-yellow-900'
                  }
                  ${currentProvider === provider.id ? 'bg-white border-white' : ''}
                `}
              >
                {provider.tier === 'free' ? '🎉 FREE' : '💎 PREMIUM'}
              </span>
            </div>

            {/* Provider Header */}
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-1">
                <h4 className="font-bold text-base mb-1">{provider.name}</h4>
                {currentProvider === provider.id && (
                  <div className="text-xs font-bold uppercase tracking-wider opacity-80">
                    ✓ Currently Active
                  </div>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="space-y-1 mb-3">
              {provider.description.map((desc, idx) => (
                <div key={idx} className="text-xs font-mono">
                  {desc}
                </div>
              ))}
            </div>

            {/* Availability Status */}
            {!provider.available && (
              <div className="mt-3 pt-3 border-t-2 border-current">
                <div className="text-xs font-bold uppercase tracking-wider mb-1">
                  ⚠️ Setup Required
                </div>
                <div className="text-xs opacity-80">
                  API key not configured. {provider.setupUrl && 'See setup instructions below.'}
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Setup Instructions for Free Tier */}
      <div className="border-4 border-black p-4 bg-green-50">
        <h4 className="text-xs font-bold uppercase tracking-widest mb-3 text-green-900">
          🚀 Setup Free AI (No Credit Card)
        </h4>
        <ol className="space-y-2 text-xs font-mono text-gray-700">
          <li className="flex gap-2">
            <span className="font-bold">1.</span>
            <span>
              Visit{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold text-green-800 hover:text-green-900"
              >
                openrouter.ai/keys
              </a>
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">2.</span>
            <span>Create account (free, no credit card needed)</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">3.</span>
            <span>Generate API key</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">4.</span>
            <span>Set <code className="bg-white px-1 py-0.5 border border-green-800">OPENROUTER_API_KEY</code> in your .env file</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">5.</span>
            <span>Restart StoryMachine server</span>
          </li>
        </ol>
      </div>

      {/* Premium Setup Instructions */}
      <div className="border-4 border-black p-4 bg-yellow-50">
        <h4 className="text-xs font-bold uppercase tracking-widest mb-3 text-yellow-900">
          💎 Setup Premium Providers
        </h4>
        <div className="space-y-3 text-xs font-mono text-gray-700">
          <div>
            <div className="font-bold mb-1">Gemini (Default):</div>
            <div>Set <code className="bg-white px-1 py-0.5 border border-yellow-800">GEMINI_API_KEY</code> in .env</div>
          </div>
          <div>
            <div className="font-bold mb-1">OpenAI or Custom Provider:</div>
            <div>Use the Settings panel's "Text LLM" tab to configure <code className="bg-white px-1 py-0.5 border border-yellow-800">AI_PROVIDER=openai-compat</code></div>
          </div>
          <div>
            <div className="font-bold mb-1">Anthropic Claude:</div>
            <div>Set <code className="bg-white px-1 py-0.5 border border-yellow-800">ANTHROPIC_API_KEY</code> in .env</div>
          </div>
        </div>
      </div>
    </div>
  );
}
