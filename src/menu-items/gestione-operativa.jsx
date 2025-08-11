// assets
import { IconBriefcase, IconReport, IconClipboardList } from '@tabler/icons-react';

// ==============================|| MENU GROUP - GESTIONE OPERATIVA ||============================== //

const gestioneOperativa = {
  id: 'gestione-operativa',
  title: 'Gestione Operativa',
  type: 'group',
  children: [
    // Rapportini sopra Commesse
    {
      id: 'rapportini',
      title: 'Rapportini',
      type: 'item',
      url: '/rapportini',
      icon: IconReport
    },
    {
      id: 'commesse',
      title: 'Commesse',
      type: 'item',
      url: '/commesse',
      icon: IconBriefcase
    },
    // Nuova voce sotto Commesse
    {
      id: 'gestione-commessa',
      title: 'Gestione Commessa',
      type: 'item',
      url: '/gestione-commessa',
      icon: IconClipboardList
    }
  ]
};

export default gestioneOperativa;

