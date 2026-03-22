import { useState } from 'react';
import Sidebar from '../components/Layout/Sidebar';
import { HelpCircle, ChevronDown, ChevronUp, Search } from 'lucide-react';

const faqData = [
  {
    category: 'Compte & Connexion',
    color: '#4ade80',
    questions: [
      {
        q: 'Comment me connecter à l\'ENT ?',
        a: 'Rendez-vous sur la page de connexion et entrez votre nom d\'utilisateur et mot de passe fournis par votre administration. En cas de problème, contactez le service informatique de l\'EST Salé.'
      },
      {
        q: 'J\'ai oublié mon mot de passe, que faire ?',
        a: 'Contactez l\'administration ou le service informatique de l\'EST Salé pour réinitialiser votre mot de passe. Votre compte Keycloak peut être mis à jour directement par un administrateur.'
      },
      {
        q: 'Mon compte est bloqué, comment le débloquer ?',
        a: 'Après plusieurs tentatives échouées, votre compte peut être temporairement suspendu. Contactez un administrateur ENT pour le réactiver.'
      },
    ]
  },
  {
    category: 'Cours & Fichiers',
    color: '#60a5fa',
    questions: [
      {
        q: 'Comment télécharger un cours ?',
        a: 'Accédez à la section "Cours" depuis votre tableau de bord, trouvez le cours souhaité et cliquez sur le bouton "Télécharger". Un lien sécurisé sera généré automatiquement.'
      },
      {
        q: 'Quels formats de fichiers sont acceptés pour les cours ?',
        a: 'L\'ENT accepte tous les formats courants : PDF, DOCX, PPTX, XLSX, ZIP, et la plupart des formats multimédia. La taille maximale par fichier est de 50 Mo.'
      },
      {
        q: 'Comment ajouter un cours en tant qu\'enseignant ?',
        a: 'Connectez-vous avec votre compte enseignant, accédez à "Cours", cliquez sur "Nouveau cours", remplissez le titre, la description et uploadez votre fichier.'
      },
    ]
  },
  {
    category: 'Messagerie & Chat',
    color: '#f59e0b',
    questions: [
      {
        q: 'Comment envoyer un message à un enseignant ?',
        a: 'Dans la section "Messagerie", cliquez sur "Nouveau message" et entrez l\'identifiant unique de votre enseignant. Vous pouvez obtenir cet identifiant auprès de l\'administration.'
      },
      {
        q: 'Comment rejoindre une room de chat ?',
        a: 'Accédez à la section "Chat", entrez le nom de la room de discussion (communiqué par votre enseignant ou votre groupe) et cliquez sur "Rejoindre".'
      },
      {
        q: 'Les messages du chat sont-ils sauvegardés ?',
        a: 'Oui, tous les messages envoyés dans une room de chat sont stockés dans la base de données et accessibles via l\'historique de la room.'
      },
    ]
  },
  {
    category: 'Examens & Devoirs',
    color: '#f87171',
    questions: [
      {
        q: 'Comment soumettre un devoir ?',
        a: 'Allez dans "Examens & Devoirs", trouvez l\'examen correspondant et cliquez sur "Soumettre". Choisissez votre fichier et confirmez l\'envoi. Assurez-vous de le faire avant la deadline.'
      },
      {
        q: 'Puis-je resoumettre un devoir après l\'avoir envoyé ?',
        a: 'La politique de resoumission dépend de votre enseignant. Contactez-le directement via la messagerie pour savoir si une nouvelle soumission est possible.'
      },
      {
        q: 'Comment consulter ma note ?',
        a: 'Les notes attribuées par votre enseignant seront visibles dans la section "Examens & Devoirs" une fois publiées. Vous serez notifié lorsque votre copie sera corrigée.'
      },
    ]
  },
  {
    category: 'Assistant IA',
    color: '#a78bfa',
    questions: [
      {
        q: 'Qu\'est-ce que l\'assistant IA de l\'ENT ?',
        a: 'L\'assistant IA est un chatbot basé sur le modèle Llama 3, déployé localement sur les serveurs de l\'EST Salé via Ollama. Il peut répondre à vos questions académiques et vous aider dans votre travail.'
      },
      {
        q: 'Mes conversations avec l\'IA sont-elles confidentielles ?',
        a: 'L\'assistant IA fonctionne entièrement sur les serveurs internes de l\'EST Salé (cloud privé). Vos données ne quittent pas l\'infrastructure de l\'école.'
      },
      {
        q: 'L\'assistant IA peut-il m\'aider à rédiger mes devoirs ?',
        a: 'L\'assistant IA est conçu pour vous aider à comprendre des concepts et vous guider dans votre apprentissage. L\'utilisation de ses réponses doit respecter la charte académique de l\'EST Salé.'
      },
    ]
  },
];

export default function FAQ() {
  const [openItems, setOpenItems] = useState({});
  const [search, setSearch] = useState('');

  const toggle = (key) => {
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filtered = faqData.map(cat => ({
    ...cat,
    questions: cat.questions.filter(
      q => q.q.toLowerCase().includes(search.toLowerCase()) ||
           q.a.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.questions.length > 0);

  return (
    <div className="page-wrapper">
      <div className="bg-mesh" />
      <Sidebar />
      <main className="page-content">
        {/* Header */}
        <div style={{ marginBottom: 32, animation: 'fadeInUp 0.5s ease forwards' }}>
          <h1 className="page-title">Assistance ENT</h1>
          <p className="page-subtitle">Foire aux questions sur votre Espace Numérique de Travail</p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 32, animation: 'fadeInUp 0.5s 0.1s ease both' }}>
          <Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            placeholder="Rechercher une question..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 44, fontSize: 14 }}
          />
        </div>

        {/* FAQ Categories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {filtered.map((cat, ci) => (
            <div key={cat.category} style={{ animation: `fadeInUp 0.4s ${ci * 0.07}s ease both` }}>
              {/* Category header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                <h2 style={{ fontSize: 14, fontWeight: 700, color: cat.color, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  {cat.category}
                </h2>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${cat.color}33, transparent)` }} />
              </div>

              {/* Questions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cat.questions.map((item, qi) => {
                  const key = `${ci}-${qi}`;
                  const isOpen = openItems[key];
                  return (
                    <div
                      key={qi}
                      className="card"
                      style={{ overflow: 'hidden', transition: 'all 0.2s ease' }}
                    >
                      {/* Question */}
                      <button
                        onClick={() => toggle(key)}
                        style={{
                          width: '100%', padding: '16px 20px',
                          background: 'none', border: 'none', cursor: 'pointer',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          gap: 12, textAlign: 'left'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <HelpCircle size={15} color={isOpen ? cat.color : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                          <span style={{ fontSize: 14, fontWeight: 500, color: isOpen ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            {item.q}
                          </span>
                        </div>
                        {isOpen
                          ? <ChevronUp size={16} color={cat.color} style={{ flexShrink: 0 }} />
                          : <ChevronDown size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                        }
                      </button>

                      {/* Answer */}
                      {isOpen && (
                        <div style={{
                          padding: '0 20px 18px 47px',
                          animation: 'fadeIn 0.2s ease forwards'
                        }}>
                          <div style={{ height: 1, background: 'rgba(74,222,128,0.08)', marginBottom: 14 }} />
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                            {item.a}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <Search size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Aucune question ne correspond à votre recherche.</p>
          </div>
        )}
      </main>
    </div>
  );
}