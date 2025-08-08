import PropTypes from 'prop-types';
import Kanban from 'views/application/kanban';

// ==============================|| PAGE ||============================== //

export default function KanbanPage({ children }) {
  return <Kanban>{children}</Kanban>;
}

KanbanPage.propTypes = { children: PropTypes.node };
