'use client';

import { useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// project imports
import MainCard from '../../../ui-component/cards/MainCard';
import { ThemeMode } from '../../../config';
import useConfig from '../../../hooks/useConfig';
import { gridSpacing } from '../../../store/constant';

import Clienti from './Clienti';
import Fornitori from './Fornitori';

// assets
import GroupsTwoToneIcon from '@mui/icons-material/GroupsTwoTone';
import StoreTwoToneIcon from '@mui/icons-material/StoreTwoTone';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`anagrafica-tabpanel-${index}`} aria-labelledby={`anagrafica-tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `anagrafica-tab-${index}`,
    'aria-controls': `anagrafica-tabpanel-${index}`
  };
}

export default function Anagrafica() {
  const theme = useTheme();
  const { borderRadius } = useConfig();
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => setValue(newValue);

  return (
    <MainCard>
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, sm: 4, md: 3 }}>
          <Tabs
            value={value}
            onChange={handleChange}
            orientation="vertical"
            variant="scrollable"
            sx={{
              '& .MuiTabs-flexContainer': { borderBottom: 'none' },
              '& button': {
                borderRadius: `${borderRadius}px`,
                color: theme.palette.mode === ThemeMode.DARK ? 'grey.600' : 'grey.900',
                minHeight: 'auto',
                minWidth: '100%',
                py: 1.5,
                px: 2,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-start',
                textAlign: 'left',
                justifyContent: 'flex-start'
              },
              '& button.Mui-selected': {
                color: 'primary.main',
                bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'grey.50'
              },
              '& button > svg': {
                marginBottom: '0px !important',
                marginRight: 1.25,
                marginTop: 1.25,
                height: 20,
                width: 20
              },
              '& button > div > span': { display: 'block' },
              '& > div > span': { display: 'none' }
            }}
          >
            <Tab
              icon={<GroupsTwoToneIcon />}
              label={
                <Grid container direction="column">
                  <Typography variant="subtitle1" color="inherit">
                    Clienti
                  </Typography>
                  <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                    Gestione anagrafiche Clienti
                  </Typography>
                </Grid>
              }
              {...a11yProps(0)}
            />
            <Tab
              icon={<StoreTwoToneIcon />}
              label={
                <Grid container direction="column">
                  <Typography variant="subtitle1" color="inherit">
                    Fornitori
                  </Typography>
                  <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                    Gestione anagrafiche Fornitori
                  </Typography>
                </Grid>
              }
              {...a11yProps(1)}
            />
          </Tabs>
        </Grid>
        <Grid size={{ xs: 12, sm: 8, md: 9 }}>
          <TabPanel value={value} index={0}>
            <Clienti />
          </TabPanel>
          <TabPanel value={value} index={1}>
            <Fornitori />
          </TabPanel>
        </Grid>
      </Grid>
    </MainCard>
  );
}


