'use client';
import PropTypes from 'prop-types';

import { useState } from 'react';

// material-ui
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContentText from '@mui/material/DialogContentText';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Paper from '@mui/material/Paper';

// third party
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, useDraggable, useSensor, useSensors } from '@dnd-kit/core';

// draggable
function PaperComponent({ top, left, ...props }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: 'draggable'
  });

  return (
    <Paper
      ref={setNodeRef}
      {...props}
      style={{ ...props.style, top, left, transform: `translate(${transform?.x ?? 0}px, ${transform?.y ?? 0}px)` }}
    >
      <DialogTitle sx={{ cursor: 'move' }} id="draggable-dialog-title" {...listeners} {...attributes}>
        Subscribe
      </DialogTitle>
      {props.children}
    </Paper>
  );
}

// ===============================|| UI DIALOG - DRAGGABLE ||=============================== //

export default function DraggableStory() {
  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const [{ x, y }, setCoordinates] = useState({ x: 0, y: 0 });

  const mouseSensor = useSensor(MouseSensor);
  const touchSensor = useSensor(TouchSensor);
  const keyboardSensor = useSensor(KeyboardSensor, {});
  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);

  return (
    <>
      <Button variant="outlined" onClick={handleClickOpen}>
        Open Draggable Dialog
      </Button>
      <DndContext
        sensors={sensors}
        onDragEnd={({ delta }) => {
          setCoordinates(({ x, y }) => ({
            x: x + delta.x,
            y: y + delta.y
          }));
        }}
      >
        <Dialog
          open={open}
          onClose={handleClose}
          PaperComponent={(props) => <PaperComponent {...props} top={y} left={x} />}
          aria-labelledby="draggable-dialog-title"
        >
          {open && (
            <>
              <DialogContent>
                <DialogContentText>
                  <Typography variant="body2" component="span">
                    To subscribe to this website, please enter your email address here. We will send updates occasionally.
                  </Typography>
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button sx={{ color: 'error.dark' }} autoFocus onClick={handleClose} color="secondary">
                  Cancel
                </Button>
                <Button variant="contained" size="small" onClick={handleClose}>
                  Subscribe
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </DndContext>
    </>
  );
}

PaperComponent.propTypes = { top: PropTypes.any, left: PropTypes.any, props: PropTypes.any };
