'use client';
import PropTypes from 'prop-types';

import { useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Box from '@mui/material/Box';

// project imports
import MyAccount from './MyAccount';
import ChangePassword from './ChangePassword';
import { ThemeMode } from '../../../../../config';
import MainCard from '../../../../../ui-component/cards/MainCard';
import { gridSpacing } from '../../../../../store/constant';

// assets
import LibraryBooksTwoToneIcon from '@mui/icons-material/LibraryBooksTwoTone';
import LockTwoToneIcon from '@mui/icons-material/LockTwoTone';

// tabs panel
function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`simple-tabpanel-${index}`} aria-labelledby={`simple-tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`
  };
}

// tabs option
const tabsOption = [
  {
    label: 'Il Mio Account',
    icon: <LibraryBooksTwoToneIcon sx={{ fontSize: '1.3rem' }} />
  },
  {
    label: 'Modifica Password',
    icon: <LockTwoToneIcon sx={{ fontSize: '1.3rem' }} />
  }
];

// ==============================|| PROFILE 1 ||============================== //

export default function Profile1() {
  const theme = useTheme();

  const [value, setValue] = useState(0);
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <MainCard>
      <Grid container spacing={gridSpacing}>
        <Grid size={12}>
          <Tabs
            value={value}
            indicatorColor="primary"
            textColor="primary"
            onChange={handleChange}
            aria-label="simple tabs example"
            variant="scrollable"
            sx={{
              mb: 3,
              '& .MuiTab-root': {
                minHeight: 'auto',
                minWidth: 10,
                py: 1.5,
                px: 1,
                mr: 2.25,
                color: theme.palette.mode === ThemeMode.DARK ? 'grey.600' : 'grey.900'
              },
              '& .Mui-selected': {
                color: 'primary.main'
              },
              '& .MuiTabs-indicator': {
                bottom: 2
              },
              '& .MuiTab-root > svg': {
                marginBottom: '0px !important',
                mr: 1.25
              }
            }}
          >
            {tabsOption.map((tab, index) => (
              <Tab key={index} icon={tab.icon} label={tab.label} iconPosition="start" {...a11yProps(index)} />
            ))}
          </Tabs>
          <TabPanel value={value} index={0}>
            <MyAccount />
          </TabPanel>
          <TabPanel value={value} index={1}>
            <ChangePassword />
          </TabPanel>
        </Grid>
      </Grid>
    </MainCard>
  );
}

TabPanel.propTypes = { children: PropTypes.any, value: PropTypes.any, index: PropTypes.any, other: PropTypes.any };
