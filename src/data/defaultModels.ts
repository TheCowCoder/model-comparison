import { Model } from '../types';

const rawModelsList = `ByteDance Seed: Seed-2.0-Lite
Qwen: Qwen3.5-9B
OpenAI: GPT-5.4 Pro
OpenAI: GPT-5.4
Inception: Mercury 2
OpenAI: GPT-5.3 Chat
Google: Gemini 3.1 Flash Lite Preview
ByteDance Seed: Seed-2.0-Mini
Google: Nano Banana 2 (Gemini 3.1 Flash Image Preview)
Qwen: Qwen3.5-35B-A3B
Qwen: Qwen3.5-27B
Qwen: Qwen3.5-122B-A10B
Qwen: Qwen3.5-Flash
LiquidAI: LFM2-24B-A2B
Google: Gemini 3.1 Pro Preview Custom Tools
NVIDIA: Llama Nemotron Embed VL 1B V2 (free)
OpenAI: GPT-5.3-Codex
AionLabs: Aion-2.0
Google: Gemini 3.1 Pro Preview
Anthropic: Claude Sonnet 4.6
Qwen: Qwen3.5 Plus 2026-02-15
Qwen: Qwen3.5 397B A17B
MiniMax: MiniMax M2.5
Z.ai: GLM 5
Qwen: Qwen3 Max Thinking
Anthropic: Claude Opus 4.6
Qwen: Qwen3 Coder Next
Sourceful: Riverflow V2 Pro
Sourceful: Riverflow V2 Fast
StepFun: Step 3.5 Flash (free)
StepFun: Step 3.5 Flash
Arcee AI: Trinity Large Preview (free)
MoonshotAI: Kimi K2.5
Upstage: Solar Pro 3
MiniMax: MiniMax M2-her
Writer: Palmyra X5
LiquidAI: LFM2.5-1.2B-Thinking (free)
LiquidAI: LFM2.5-1.2B-Instruct (free)
OpenAI: GPT Audio
OpenAI: GPT Audio Mini
Z.ai: GLM 4.7 Flash
Black Forest Labs: FLUX.2 Klein 4B
OpenAI: GPT-5.2-Codex
AllenAI: Molmo2 8B
AllenAI: Olmo 3.1 32B Instruct
ByteDance Seed: Seedream 4.5
ByteDance Seed: Seed 1.6 Flash
ByteDance Seed: Seed 1.6
MiniMax: MiniMax M2.1
Z.ai: GLM 4.7
Google: Gemini 3 Flash Preview
Mistral: Mistral Small Creative
AllenAI: Olmo 3.1 32B Think
Black Forest Labs: FLUX.2 Max
Xiaomi: MiMo-V2-Flash
NVIDIA: Nemotron 3 Nano 30B A3B (free)
NVIDIA: Nemotron 3 Nano 30B A3B
OpenAI: GPT-5.2 Chat
OpenAI: GPT-5.2 Pro
OpenAI: GPT-5.2
Mistral: Devstral 2 2512
Sourceful: Riverflow V2 Max Preview
Sourceful: Riverflow V2 Standard Preview
Sourceful: Riverflow V2 Fast Preview
Relace: Relace Search
Z.ai: GLM 4.6V
Nex AGI: DeepSeek V3.1 Nex N1
EssentialAI: Rnj 1 Instruct
OpenAI: GPT-5.1-Codex-Max
Amazon: Nova 2 Lite
Mistral: Ministral 3 14B 2512
Mistral: Ministral 3 8B 2512
Mistral: Ministral 3 3B 2512
Mistral: Mistral Large 3 2512
Arcee AI: Trinity Mini (free)
Arcee AI: Trinity Mini
DeepSeek: DeepSeek V3.2 Speciale
DeepSeek: DeepSeek V3.2
Prime Intellect: INTELLECT-3
Black Forest Labs: FLUX.2 Flex
Black Forest Labs: FLUX.2 Pro
Anthropic: Claude Opus 4.5
AllenAI: Olmo 3 32B Think
AllenAI: Olmo 3 7B Instruct
AllenAI: Olmo 3 7B Think
Google: Nano Banana Pro (Gemini 3 Pro Image Preview)
xAI: Grok 4.1 Fast
Google: Gemini 3 Pro Preview
Thenlper: GTE-Base
Thenlper: GTE-Large
Intfloat: E5-Large-v2
Intfloat: E5-Base-v2
Intfloat: Multilingual-E5-Large
Sentence Transformers: paraphrase-MiniLM-L6-v2
Sentence Transformers: all-MiniLM-L12-v2
BAAI: bge-base-en-v1.5
Sentence Transformers: multi-qa-mpnet-base-dot-v1
BAAI: bge-large-en-v1.5
BAAI: bge-m3
Sentence Transformers: all-mpnet-base-v2
Sentence Transformers: all-MiniLM-L6-v2
Deep Cogito: Cogito v2.1 671B
OpenAI: GPT-5.1
OpenAI: GPT-5.1 Chat
OpenAI: GPT-5.1-Codex
OpenAI: GPT-5.1-Codex-Mini
Kwaipilot: KAT-Coder-Pro V1
MoonshotAI: Kimi K2 Thinking
Amazon: Nova Premier 1.0
Mistral: Mistral Embed 2312
Google: Gemini Embedding 001
OpenAI: Text Embedding Ada 002
Mistral: Codestral Embed 2505
OpenAI: Text Embedding 3 Large
OpenAI: Text Embedding 3 Small
Perplexity: Sonar Pro Search
Mistral: Voxtral Small 24B 2507
OpenAI: gpt-oss-safeguard-20b
Qwen: Qwen3 Embedding 8B
NVIDIA: Nemotron Nano 12B 2 VL (free)
NVIDIA: Nemotron Nano 12B 2 VL
Qwen: Qwen3 Embedding 4B
MiniMax: MiniMax M2
Qwen: Qwen3 VL 32B Instruct
LiquidAI: LFM2-8B-A1B
LiquidAI: LFM2-2.6B
IBM: Granite 4.0 Micro
OpenAI: GPT-5 Image Mini
Anthropic: Claude Haiku 4.5
Qwen: Qwen3 VL 8B Thinking
Qwen: Qwen3 VL 8B Instruct
OpenAI: GPT-5 Image
OpenAI: o3 Deep Research
OpenAI: o4 Mini Deep Research
NVIDIA: Llama 3.3 Nemotron Super 49B V1.5
Baidu: ERNIE 4.5 21B A3B Thinking
Google: Nano Banana (Gemini 2.5 Flash Image)
Qwen: Qwen3 VL 30B A3B Thinking
Qwen: Qwen3 VL 30B A3B Instruct
OpenAI: GPT-5 Pro
Z.ai: GLM 4.6
Z.ai: GLM 4.6 (exacto)
Anthropic: Claude Sonnet 4.5
DeepSeek: DeepSeek V3.2 Exp
TheDrummer: Cydonia 24B V4.1
Relace: Relace Apply 3
Google: Gemini 2.5 Flash Lite Preview 09-2025
Qwen: Qwen3 VL 235B A22B Thinking
Qwen: Qwen3 VL 235B A22B Instruct
Qwen: Qwen3 Max
Qwen: Qwen3 Coder Plus
OpenAI: GPT-5 Codex
DeepSeek: DeepSeek V3.1 Terminus (exacto)
DeepSeek: DeepSeek V3.1 Terminus
xAI: Grok 4 Fast
Tongyi DeepResearch 30B A3B
Qwen: Qwen3 Coder Flash
Qwen: Qwen3 Next 80B A3B Thinking
Qwen: Qwen3 Next 80B A3B Instruct (free)
Qwen: Qwen3 Next 80B A3B Instruct
Meituan: LongCat Flash Chat
Qwen: Qwen Plus 0728 (thinking)
Qwen: Qwen Plus 0728
NVIDIA: Nemotron Nano 9B V2 (free)
NVIDIA: Nemotron Nano 9B V2
MoonshotAI: Kimi K2 0905
MoonshotAI: Kimi K2 0905 (exacto)
Qwen: Qwen3 30B A3B Thinking 2507
xAI: Grok Code Fast 1
Nous: Hermes 4 70B
Nous: Hermes 4 405B
DeepSeek: DeepSeek V3.1
OpenAI: GPT-4o Audio
Mistral: Mistral Medium 3.1
Baidu: ERNIE 4.5 21B A3B
Baidu: ERNIE 4.5 VL 28B A3B
Z.ai: GLM 4.5V
AI21: Jamba Large 1.7
OpenAI: GPT-5 Chat
OpenAI: GPT-5
OpenAI: GPT-5 Mini
OpenAI: GPT-5 Nano
OpenAI: gpt-oss-120b (free)
OpenAI: gpt-oss-120b
OpenAI: gpt-oss-120b (exacto)
OpenAI: gpt-oss-20b (free)
OpenAI: gpt-oss-20b
Anthropic: Claude Opus 4.1
Mistral: Codestral 2508
Qwen: Qwen3 Coder 30B A3B Instruct
Qwen: Qwen3 30B A3B Instruct 2507
Z.ai: GLM 4.5
Z.ai: GLM 4.5 Air (free)
Z.ai: GLM 4.5 Air
Qwen: Qwen3 235B A22B Thinking 2507
Z.ai: GLM 4 32B
Qwen: Qwen3 Coder 480B A35B (free)
Qwen: Qwen3 Coder 480B A35B
Qwen: Qwen3 Coder 480B A35B (exacto)
ByteDance: UI-TARS 7B
Google: Gemini 2.5 Flash Lite
Qwen: Qwen3 235B A22B Instruct 2507
Switchpoint Router
MoonshotAI: Kimi K2 0711
Mistral: Devstral Medium
Mistral: Devstral Small 1.1
Venice: Uncensored (free)
xAI: Grok 4
Google: Gemma 3n 2B (free)
Tencent: Hunyuan A13B Instruct
TNG: DeepSeek R1T2 Chimera
Morph: Morph V3 Large
Morph: Morph V3 Fast
Baidu: ERNIE 4.5 VL 424B A47B
Baidu: ERNIE 4.5 300B A47B
Inception: Mercury
Mistral: Mistral Small 3.2 24B
MiniMax: MiniMax M1
Google: Gemini 2.5 Flash
Google: Gemini 2.5 Pro
OpenAI: o3 Pro
xAI: Grok 3 Mini
xAI: Grok 3
Google: Gemini 2.5 Pro Preview 06-05
DeepSeek: R1 0528
Anthropic: Claude Opus 4
Anthropic: Claude Sonnet 4
Google: Gemma 3n 4B (free)
Google: Gemma 3n 4B
Mistral: Mistral Medium 3
Google: Gemini 2.5 Pro Preview 05-06
Arcee AI: Spotlight
Arcee AI: Maestro Reasoning
Arcee AI: Virtuoso Large
Arcee AI: Coder Large
Inception: Mercury Coder
Qwen: Qwen3 4B (free)
Meta: Llama Guard 4 12B
Qwen: Qwen3 30B A3B
Qwen: Qwen3 8B
Qwen: Qwen3 14B
Qwen: Qwen3 32B
Qwen: Qwen3 235B A22B
OpenAI: o4 Mini High
OpenAI: o3
OpenAI: o4 Mini
Qwen: Qwen2.5 Coder 7B Instruct
OpenAI: GPT-4.1
OpenAI: GPT-4.1 Mini
OpenAI: GPT-4.1 Nano
EleutherAI: Llemma 7b
AlfredPros: CodeLLaMa 7B Instruct Solidity
xAI: Grok 3 Mini Beta
xAI: Grok 3 Beta
Meta: Llama 4 Maverick
Meta: Llama 4 Scout
Qwen: Qwen2.5 VL 32B Instruct
DeepSeek: DeepSeek V3 0324
OpenAI: o1-pro
Mistral: Mistral Small 3.1 24B (free)
Mistral: Mistral Small 3.1 24B
AllenAI: Olmo 2 32B Instruct
Google: Gemma 3 4B (free)
Google: Gemma 3 4B
Google: Gemma 3 12B (free)
Google: Gemma 3 12B
Cohere: Command A
OpenAI: GPT-4o-mini Search Preview
OpenAI: GPT-4o Search Preview
Google: Gemma 3 27B (free)
Google: Gemma 3 27B
TheDrummer: Skyfall 36B V2
Perplexity: Sonar Reasoning Pro
Perplexity: Sonar Pro
Perplexity: Sonar Deep Research
Qwen: QwQ 32B
Google: Gemini 2.0 Flash Lite
Anthropic: Claude 3.7 Sonnet
Anthropic: Claude 3.7 Sonnet (thinking)
Mistral: Saba
Llama Guard 3 8B
OpenAI: o3 Mini High
Google: Gemini 2.0 Flash
Qwen: Qwen VL Plus
AionLabs: Aion-1.0
AionLabs: Aion-1.0-Mini
AionLabs: Aion-RP 1.0 (8B)
Qwen: Qwen VL Max
Qwen: Qwen-Turbo
Qwen: Qwen2.5 VL 72B Instruct
Qwen: Qwen-Plus
Qwen: Qwen-Max
OpenAI: o3 Mini
Mistral: Mistral Small 3
DeepSeek: R1 Distill Qwen 32B
Perplexity: Sonar
DeepSeek: R1 Distill Llama 70B
DeepSeek: R1
MiniMax: MiniMax-01
Microsoft: Phi 4
Sao10K: Llama 3.1 70B Hanami x1
DeepSeek: DeepSeek V3
Sao10K: Llama 3.3 Euryale 70B
OpenAI: o1
Cohere: Command R7B (12-2024)
Meta: Llama 3.3 70B Instruct (free)
Meta: Llama 3.3 70B Instruct
Amazon: Nova Lite 1.0
Amazon: Nova Micro 1.0
Amazon: Nova Pro 1.0
OpenAI: GPT-4o (2024-11-20)
Mistral Large 2411
Mistral Large 2407
Mistral: Pixtral Large 2411
Qwen2.5 Coder 32B Instruct
SorcererLM 8x22B
TheDrummer: UnslopNemo 12B
Anthropic: Claude 3.5 Haiku
Magnum v4 72B
Anthropic: Claude 3.5 Sonnet
Qwen: Qwen2.5 7B Instruct
NVIDIA: Llama 3.1 Nemotron 70B Instruct
Inflection: Inflection 3 Pi
Inflection: Inflection 3 Productivity
TheDrummer: Rocinante 12B
Meta: Llama 3.2 3B Instruct (free)
Meta: Llama 3.2 3B Instruct
Meta: Llama 3.2 1B Instruct
Meta: Llama 3.2 11B Vision Instruct
Qwen2.5 72B Instruct
Cohere: Command R (08-2024)
Cohere: Command R+ (08-2024)
Sao10K: Llama 3.1 Euryale 70B v2.2
Qwen: Qwen2.5-VL 7B Instruct
Nous: Hermes 3 70B Instruct
Nous: Hermes 3 405B Instruct (free)
Nous: Hermes 3 405B Instruct
Sao10K: Llama 3 8B Lunaris
OpenAI: GPT-4o (2024-08-06)
Meta: Llama 3.1 405B (base)
Meta: Llama 3.1 8B Instruct
Meta: Llama 3.1 405B Instruct
Meta: Llama 3.1 70B Instruct
Mistral: Mistral Nemo
OpenAI: GPT-4o-mini (2024-07-18)
OpenAI: GPT-4o-mini
Google: Gemma 2 27B
Google: Gemma 2 9B
Sao10k: Llama 3 Euryale 70B v2.1
NousResearch: Hermes 2 Pro - Llama-3 8B
OpenAI: GPT-4o (2024-05-13)
OpenAI: GPT-4o
OpenAI: GPT-4o (extended)
Meta: Llama 3 70B Instruct
Meta: Llama 3 8B Instruct
Mistral: Mixtral 8x22B Instruct
WizardLM-2 8x22B
OpenAI: GPT-4 Turbo
Anthropic: Claude 3 Haiku
Mistral Large
OpenAI: GPT-3.5 Turbo (older v0613)
OpenAI: GPT-4 Turbo Preview
Mistral: Mixtral 8x7B Instruct
Goliath 120B
OpenAI: GPT-4 Turbo (older v1106)
OpenAI: GPT-3.5 Turbo Instruct
Mistral: Mistral 7B Instruct v0.1
OpenAI: GPT-3.5 Turbo 16k
Mancer: Weaver (alpha)
ReMM SLERP 13B
MythoMax 13B
OpenAI: GPT-4 (older v0314)
OpenAI: GPT-4
OpenAI: GPT-3.5 Turbo
Aurora Alpha
Pony Alpha
Free Models Router
Body Builder (beta)
TNG: R1T Chimera
Bert-Nebulon Alpha
Sherlock Dash Alpha
Sherlock Think Alpha
Polaris Alpha
Qwen: Qwen3 Embedding 0.6B
Andromeda Alpha
Deep Cogito: Cogito V2 Preview Llama 405B
Google: Gemini 2.5 Flash Preview 09-2025
Arcee AI: AFM 4.5B
OpenGVLab: InternVL3 78B
Sonoma Dusk Alpha
Sonoma Sky Alpha
ByteDance: Seed OSS 36B Instruct
Deep Cogito: Cogito V2 Preview Llama 70B
Cogito V2 Preview Llama 109B
Deep Cogito: Cogito V2 Preview Deepseek 671B
StepFun: Step3
Google: Gemini 2.5 Flash Image Preview (Nano Banana)
DeepSeek: DeepSeek V3.1 Base
AI21: Jamba Mini 1.7
Horizon Beta
Horizon Alpha
THUDM: GLM 4.1V 9B Thinking
Cypher Alpha
Morph: Fast Apply
MoonshotAI: Kimi Dev 72B
Mistral: Magistral Small 2506
Mistral: Magistral Medium 2506
SentientAGI: Dobby Mini Plus Llama 3.1 8B
DeepSeek: R1 Distill Qwen 7B
DeepSeek: DeepSeek R1 0528 Qwen3 8B
Google: Gemma 1 2B
Sarvam AI: Sarvam-M
TheDrummer: Valkyrie 49B V1
Mistral: Devstral Small 2505
OpenAI: Codex Mini
Meta: Llama 3.3 8B Instruct
Nous: DeepHermes 3 Mistral 24B Preview
Arcee AI: Caller Large
Arcee AI: Virtuoso Medium V2
Arcee AI: Arcee Blitz
Microsoft: Phi 4 Reasoning Plus
Microsoft: Phi 4 Reasoning
Qwen: Qwen3 0.6B
Qwen: Qwen3 1.7B
OpenGVLab: InternVL3 14B
OpenGVLab: InternVL3 2B
DeepSeek: DeepSeek Prover V2
TNG: DeepSeek R1T Chimera
THUDM: GLM Z1 Rumination 32B
THUDM: GLM Z1 9B
THUDM: GLM 4 9B
Microsoft: MAI DS R1
THUDM: GLM Z1 32B
THUDM: GLM 4 32B
ArliAI: QwQ 32B RpR v1
Agentica: Deepcoder 14B Preview
MoonshotAI: Kimi VL A3B Thinking
Optimus Alpha
NVIDIA: Llama 3.1 Nemotron Nano 8B v1
NVIDIA: Llama 3.3 Nemotron Super 49B v1
NVIDIA: Llama 3.1 Nemotron Ultra 253B v1
Swallow: Llama 3.1 Swallow 8B Instruct V0.3
Quasar Alpha
OpenHands LM 32B V0.1
DeepSeek: DeepSeek V3 Base
Typhoon2 8B Instruct
Typhoon2 70B Instruct
Bytedance: UI-TARS 72B
Qwen: Qwen2.5 VL 3B Instruct
Google: Gemini 2.5 Pro Experimental
Qrwkv 72B
OlympicCoder 32B
SteelSkull: L3.3 Electra R1 70B
Google: Gemma 3 1B
AI21: Jamba 1.6 Large
AI21: Jamba Mini 1.6
Reka: Flash 3
LatitudeGames: Wayfarer Large 70B Llama 3.3
Microsoft: Phi 4 Multimodal Instruct
DeepSeek: DeepSeek R1 Zero
Qwen: Qwen2.5 32B Instruct
MoonshotAI: Moonlight 16B A3B Instruct
Nous: DeepHermes 3 Llama 3 8B Preview
OpenAI: GPT-4.5 (Preview)
Perplexity: R1 1776
Dolphin3.0 R1 Mistral 24B
Dolphin3.0 Mistral 24B
Llama 3.1 Tulu 3 405B
DeepSeek: R1 Distill Llama 8B
DeepSeek: R1 Distill Qwen 1.5B
DeepSeek: R1 Distill Qwen 14B
Perplexity: Sonar Reasoning
Liquid: LFM 7B
Liquid: LFM 3B
Mistral: Codestral 2501
Inflatebot: Mag Mell R1 12B
EVA Llama 3.33 70B
xAI: Grok 2 Vision 1212
xAI: Grok 2 1212
Google: Gemini 2.0 Flash Experimental
Qwen: QwQ 32B Preview
Google: Gemini Experimental 1121
EVA Qwen2.5 72B
xAI: Grok Vision Beta
Google: Gemini Experimental 1114
Infermatic: Mistral Nemo Inferor 12B
EVA Qwen2.5 32B
Anthropic: Claude 3.5 Haiku (2024-10-22)
NeverSleep: Lumimaid v0.2 70B
xAI: Grok Beta
Mistral: Ministral 8B
Mistral: Ministral 3B
xAI: Grok 2
xAI: Grok 2 mini
Google: Gemini 1.5 Flash 8B
Liquid: LFM 40B MoE
EVA Qwen2.5 14B
Magnum v2 72B
Meta: Llama 3.2 90B Vision Instruct
NeverSleep: Lumimaid v0.2 8B
OpenAI: o1-mini (2024-09-12)
OpenAI: o1-mini
OpenAI: o1-preview (2024-09-12)
OpenAI: o1-preview
Mistral: Pixtral 12B
Reflection 70B
Google: Gemini 1.5 Flash Experimental
Lynn: Llama 3 Soliloquy 7B v3 32K
AI21: Jamba 1.5 Mini
Yi 1.5 34B Chat
AI21: Jamba 1.5 Large
Microsoft: Phi-3.5 Mini 128K Instruct
OpenAI: ChatGPT-4o
Aetherwiing: Starcannon 12B
01.AI: Yi Vision
01.AI: Yi Large FC
01.AI: Yi Large Turbo
Mistral Nemo 12B Celeste
Perplexity: Llama 3.1 Sonar 70B Online
Perplexity: Llama 3.1 Sonar 8B Online
Google: Gemini 1.5 Pro Experimental
Dolphin Llama 3 70B 🐬
Mistral: Codestral Mamba
Qwen 2 7B Instruct
Magnum 72B
Nous: Hermes 2 Theta 8B
Sao10K: Llama 3 Stheno 8B v3.3 32K
AI21: Jamba Instruct
01.AI: Yi Large
NVIDIA: Nemotron-4 340B Instruct
Anthropic: Claude 3.5 Sonnet (2024-06-20)
Microsoft: Phi-3 Medium 4K Instruct
StarCoder2 15B Instruct
Dolphin 2.9.2 Mixtral 8x22B 🐬
Qwen 2 72B Instruct
OpenChat 3.6 8B
Mistral: Mistral 7B Instruct
Mistral: Mistral 7B Instruct v0.3
Microsoft: Phi-3 Mini 128K Instruct
Microsoft: Phi-3 Medium 128K Instruct
NeverSleep: Llama 3 Lumimaid 70B
Perplexity: Llama3 Sonar 70B
Perplexity: Llama3 Sonar 8B Online
Perplexity: Llama3 Sonar 8B
DeepSeek V2.5
Perplexity: Llama3 Sonar 70B Online
Google: Gemini 1.5 Flash
Meta: LlamaGuard 2 8B
Meta: Llama 3 70B (Base)
Meta: Llama 3 8B (Base)
LLaVA v1.6 34B
OLMo 7B Instruct
Qwen 1.5 4B Chat
Qwen 1.5 7B Chat
Qwen 1.5 14B Chat
Qwen 1.5 32B Chat
Qwen 1.5 72B Chat
Qwen 1.5 110B Chat
NeverSleep: Llama 3 Lumimaid 8B
Snowflake: Arctic Instruct
Fireworks: FireLLaVA 13B
Lynn: Llama 3 Soliloquy 8B v2
Fimbulvetr 11B v2
WizardLM-2 7B
Zephyr 141B-A35B
Mistral: Mixtral 8x22B (base)
Google: Gemini 1.5 Pro
Cohere: Command R+
Cohere: Command R+ (04-2024)
Databricks: DBRX 132B Instruct
Midnight Rose 70B
Cohere: Command R
Cohere: Command
Anthropic: Claude 3 Sonnet
Anthropic: Claude 3 Opus
Cohere: Command R (03-2024)
Google: Gemma 7B
Nous: Hermes 2 Mistral 7B DPO
Meta: CodeLlama 70B Instruct
RWKV v5: Eagle 7B
Yi 34B 200K
Nous: Hermes 2 Mixtral 8x7B SFT
Nous: Hermes 2 Mixtral 8x7B DPO
Mistral Small
Mistral Medium
Mistral Tiny
Bagel 34B v0.2
Noromaid Mixtral 8x7B Instruct
Nous: Hermes 2 Yi 34B
Mistral: Mistral 7B Instruct v0.2
Dolphin 2.6 Mixtral 8x7B 🐬
RWKV v5 3B AI Town
RWKV v5 World 3B
StripedHyena Hessian 7B (base)
StripedHyena Nous 7B
Psyfighter v2 13B
Nous: Hermes 2 Vision 7B (alpha)
MythoMist 7B
Yi 6B (base)
Yi 34B Chat
Yi 34B (base)
Cinematika 7B (alpha)
Nous: Capybara 7B
Psyfighter 13B
OpenChat 3.5 7B
Noromaid 20B
Neural Chat 7B v3.1
Anthropic: Claude Instant v1.1
Anthropic: Claude v2
Anthropic: Claude v2.1
OpenHermes 2.5 Mistral 7B
LLaVA 13B
Nous: Capybara 34B
OpenAI: GPT-4 Vision
lzlv 70B
Toppy M 7B
Auto Router
OpenAI: GPT-3.5 Turbo 16k (older v1106)
Google: PaLM 2 Code Chat 32k
Google: PaLM 2 Chat 32k
OpenHermes 2 Mistral 7B
Mistral OpenOrca 7B
Airoboros 70B
Nous: Hermes 70B
Xwin 70B
Synthia 70B
Pygmalion: Mythalion 13B
OpenAI: GPT-4 32k (older v0314)
OpenAI: GPT-4 32k
Nous: Hermes 13B
Phind: CodeLlama 34B v2
Meta: CodeLlama 34B Instruct
Hugging Face: Zephyr 7B
Anthropic: Claude Instant v1.0
Anthropic: Claude v1.2
Anthropic: Claude v1
Anthropic: Claude Instant v1
Anthropic: Claude v2.0
Google: PaLM 2 Code Chat
Google: PaLM 2 Chat
Meta: Llama 2 70B Chat
Meta: Llama 2 13B Chat
OpenAI: GPT-3.5 Turbo (older v0301)
Unknown: Raptor Mini`;

const seenIds = new Set<string>();

const deterministicOffset = (value: string, max: number) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 100000;
  }
  return (hash / 100000) * max;
};

export const defaultModelsList: Model[] = rawModelsList.split('\n').filter(Boolean).map((line, i) => {
  const parts = line.split(': ');
  const name = parts.length > 1 ? parts.slice(1).join(': ').trim() : parts[0].trim();
  const provider = parts.length > 1 ? parts[0].trim() : 'Unknown';
  
  const idLower = name.toLowerCase();
  const intelligenceOffset = deterministicOffset(name, 10);
  let intelligence = 50;
  
  if (idLower.includes('opus') || idLower.includes('gpt-4') || idLower.includes('gpt-5') || idLower.includes('sonnet') || idLower.includes('gemini-1.5-pro') || idLower.includes('gemini-2') || idLower.includes('gemini-3') || idLower.includes('o1') || idLower.includes('o3') || idLower.includes('o4') || idLower.includes('deepseek v3')) {
    intelligence = 92 + deterministicOffset(name, 6);
  } else if (idLower.includes('70b') || idLower.includes('72b') || idLower.includes('llama-3.1-405b') || idLower.includes('qwen2.5') || idLower.includes('qwen3')) {
    intelligence = 80 + deterministicOffset(name, 10);
  } else if (idLower.includes('8b') || idLower.includes('haiku') || idLower.includes('mixtral') || idLower.includes('gemma') || idLower.includes('phi-3') || idLower.includes('mini') || idLower.includes('flash')) {
    intelligence = 65 + deterministicOffset(name, 10);
  } else {
    intelligence = 50 + intelligenceOffset * 2;
  }

  let speed = 100 - (intelligence * 0.5);
  if (idLower.includes('groq') || idLower.includes('fast') || idLower.includes('edge') || idLower.includes('lite') || idLower.includes('mini') || idLower.includes('flash') || idLower.includes('haiku') || idLower.includes('8b')) {
    speed = Math.min(100, speed + 30);
  }
  speed = Math.max(10, Math.min(100, speed));

  let frontend = intelligence * 0.85;
  let backend = intelligence * 0.90;
  if (idLower.includes('claude') || idLower.includes('sonnet')) {
    frontend = Math.min(98, intelligence * 0.98);
  }
  if (idLower.includes('gpt-4') || idLower.includes('o1') || idLower.includes('o3') || idLower.includes('deepseek')) {
    backend = Math.min(98, intelligence * 0.98);
  }

  const comprehensiveScore = (intelligence * 0.5) + (speed * 0.3) + 10;

  let baseId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  // Special case for +
  if (name.includes('+')) {
    baseId += '-plus';
  }
  
  let finalId = baseId;
  let counter = 1;
  while (seenIds.has(finalId)) {
    finalId = `${baseId}-${counter}`;
    counter++;
  }
  seenIds.add(finalId);

  return {
    id: finalId,
    name: name,
    subtitle: provider,
    scores: {},
    stats: {
      humanUnderstanding: 0,
      intelligence,
      speed,
      frontend,
      backend,
      comprehensiveScore,
      contextLength: 128000,
      pricePer1M: 1.0
    }
  };
});
