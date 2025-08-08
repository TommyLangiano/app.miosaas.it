// assets
import { IconUsersGroup, IconUser } from '@tabler/icons-react';

// ==============================|| MENU GROUP - AMMINISTRAZIONE ||============================== //

const amministrazione = {
  id: 'amministrazione',
  title: 'Amministrazione',
  type: 'group',
  children: [
    {
      id: 'gestione-utenti',
      title: 'Gestione Utenti',
      type: 'item',
      url: '/gestione-utenti',
      icon: IconUsersGroup
    }
  ]
};

export default amministrazione;

