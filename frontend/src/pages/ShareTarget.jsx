import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Modal from '../components/ui/Modal';
import WishlistForm from '../components/places/WishlistForm';
import PlaceForm from '../components/places/PlaceForm';
import RecipeForm from '../components/recipes/RecipeForm';
import CineForm from '../components/cine/CineForm';
import { createWishlist } from '../api/placesWishlist';
import { createVisited } from '../api/placesVisited';
import { uploadPhotos, uploadWishlistPhotos } from '../api/photos';
import '../styles/share.css';

function detectType(url) {
  if (!url) return 'unknown';
  if (/maps\.google|google\.com\/maps|goo\.gl\/maps|maps\.app\.goo/i.test(url)) return 'maps';
  if (/instagram|tiktok|reels|fb\.watch/i.test(url)) return 'social';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'video';
  return 'link';
}

const OPTIONS = [
  {
    id: 'wishlist',
    icon: '★',
    label: 'Por hacer',
    desc: 'Guardarlo como algo pendiente',
    hints: {
      maps: 'Parece un lugar — lo agrego a la lista',
      social: 'Guardar el reel para después',
      video: 'Guardarlo para después',
    },
  },
  {
    id: 'visited',
    icon: '✓',
    label: 'Ya hicimos',
    desc: 'Registrarlo como algo que ya hicimos',
    hints: {
      maps: 'Registrar este lugar como visitado',
    },
  },
  {
    id: 'cine',
    icon: '🎬',
    label: 'Al cine',
    desc: 'Agregar película o serie a nuestra lista',
    hints: {
      video: 'Guardar el tráiler en el cine',
      social: 'Guardar en la lista del cine',
    },
  },
  {
    id: 'recipe',
    icon: '🍴',
    label: 'Receta nueva',
    desc: 'Agregar como receta',
    hints: {
      video: 'Guardar el video como receta',
      social: 'Guardar el reel como receta',
    },
  },
];

export default function ShareTarget() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const sharedUrl   = searchParams.get('url') || '';
  const sharedText  = searchParams.get('text') || '';
  const sharedTitle = searchParams.get('title') || '';
  const url = sharedUrl || (sharedText.startsWith('http') ? sharedText : '');
  const urlType = detectType(url);

  if (!url) {
    navigate('/');
    return null;
  }

  const wishlistInitial = {
    name: sharedTitle,
    google_maps_url: urlType === 'maps' ? url : '',
    social_url: urlType !== 'maps' ? url : '',
  };

  const visitedInitial = {
    name: sharedTitle,
    google_maps_url: urlType === 'maps' ? url : '',
  };

  const recipeInitial = {
    video_url: url,
  };

  const cineInitial = {
    trailer_url: url,
  };

  const handleWishlistSave = async (data, files) => {
    setSaving(true);
    try {
      const place = await createWishlist(data);
      if (files?.length) await uploadWishlistPhotos(place.id, files);
      navigate('/por-visitar');
    } finally {
      setSaving(false);
    }
  };

  const handleVisitedSave = async (data, files) => {
    setSaving(true);
    try {
      const place = await createVisited(data);
      if (files?.length) await uploadPhotos(place.id, files);
      navigate('/visitados');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="share-target container">
      <div className="share-target__header">
        <h2 className="share-target__title">¿Qué querés agregar?</h2>
        <p className="share-target__url">
          {url.length > 60 ? url.slice(0, 60) + '…' : url}
        </p>
      </div>

      <div className="share-target__options">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            className="share-option"
            onClick={() => setSelected(opt.id)}
          >
            <span className="share-option__icon">{opt.icon}</span>
            <div className="share-option__text">
              <strong className="share-option__label">{opt.label}</strong>
              <span className="share-option__desc">
                {opt.hints?.[urlType] || opt.desc}
              </span>
            </div>
            <span className="share-option__arrow">›</span>
          </button>
        ))}
      </div>

      <Modal isOpen={selected === 'wishlist'} onClose={() => setSelected(null)} title="Agregar a Por hacer">
        <WishlistForm
          initialData={wishlistInitial}
          onSubmit={handleWishlistSave}
          onCancel={() => setSelected(null)}
          loading={saving}
        />
      </Modal>

      <Modal isOpen={selected === 'visited'} onClose={() => setSelected(null)} title="Registrar en Ya hicimos">
        <PlaceForm
          initialData={visitedInitial}
          onSubmit={handleVisitedSave}
          onCancel={() => setSelected(null)}
          loading={saving}
        />
      </Modal>

      <Modal isOpen={selected === 'cine'} onClose={() => setSelected(null)} title="Agregar al cine" wide>
        <CineForm
          initialData={cineInitial}
          onSaved={() => navigate('/cine')}
          onCancel={() => setSelected(null)}
        />
      </Modal>

      <Modal isOpen={selected === 'recipe'} onClose={() => setSelected(null)} title="Nueva receta" wide>
        <RecipeForm
          initialData={recipeInitial}
          onSaved={() => navigate('/recetas')}
          onCancel={() => setSelected(null)}
        />
      </Modal>
    </div>
  );
}
