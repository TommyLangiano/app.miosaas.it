// assets
import { IconBriefcase, IconReport } from '@tabler/icons-react';

// ==============================|| MENU GROUP - GESTIONE OPERATIVA ||============================== //

const gestioneOperativa = {
  id: 'gestione-operativa',
  title: 'Gestione Operativa',
  type: 'group',
  children: [
    {
      id: 'commesse',
      title: 'Commesse',
      type: 'item',
      url: '/commesse',
      icon: IconBriefcase
    },
    {
      id: 'rapportini',
      title: 'Rapportini',
      type: 'item',
      url: '/rapportini',
      icon: IconReport
    }
  ]
};

export default gestioneOperativa;

