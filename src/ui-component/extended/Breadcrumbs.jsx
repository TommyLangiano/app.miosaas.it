'use client';
import PropTypes from 'prop-types';

// next
import Link from 'next/link';

import { usePathname } from 'next/navigation';

import { useEffect, useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import MuiBreadcrumbs from '@mui/material/Breadcrumbs';
import Box from '@mui/material/Box';
import axios from '../../utils/axios';

// project imports
import { ThemeMode, ThemeDirection } from '../../config';
import navigation from '../../menu-items';
import useConfig from '../../hooks/useConfig';

// assets
import { IconChevronRight, IconTallymark1 } from '@tabler/icons-react';
import AccountTreeTwoToneIcon from '@mui/icons-material/AccountTreeTwoTone';
import HomeIcon from '@mui/icons-material/Home';
import HomeTwoToneIcon from '@mui/icons-material/HomeTwoTone';

// third-party
import { FormattedMessage } from 'react-intl';

// ==============================|| BREADCRUMBS TITLE ||============================== //

function BTitle({ title, isIntlId = true }) {
  return (
    <Grid>
      <Typography variant="h4" sx={{ fontWeight: 500 }}>
        {isIntlId ? <FormattedMessage id={title} /> : title}
      </Typography>
    </Grid>
  );
}

export default function Breadcrumbs({
  card,
  custom = false,
  divider = false,
  heading,
  icon = true,
  icons,
  links,
  maxItems,
  rightAlign = true,
  separator = IconChevronRight,
  title = true,
  titleBottom,
  sx,
  ...others
}) {
  const theme = useTheme();
  const pathname = usePathname();
  const { themeDirection } = useConfig();
  const [main, setMain] = useState();
  const [item, setItem] = useState();
  const [overrideHeading, setOverrideHeading] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [detailTitle, setDetailTitle] = useState(null);
  const [detailId, setDetailId] = useState(null);

  const iconSX = {
    marginRight: 6,
    marginTop: -2,
    width: '1rem',
    height: '1rem',
    color: theme.palette.secondary.main
  };

  const linkSX = {
    display: 'flex',
    color: 'grey.900',
    textDecoration: 'none',
    alignContent: 'center',
    alignItems: 'center'
  };

  const customLocation = pathname;

  useEffect(() => {
    // Reset override by route
    setOverrideHeading(null);

    // Riconoscimento rotte commesse
    const matchEdit = /^\/commesse\/([^/]+)\/modifica$/.exec(customLocation || '');
    const matchDetail = /^\/commesse\/([^/]+)$/.exec(customLocation || '');
    const matchCreate = /^\/commesse\/nuova$/.exec(customLocation || '');
    const isEdit = !!matchEdit && matchEdit[1] !== 'nuova';
    const isDetail = !!matchDetail && matchDetail[1] !== 'nuova';
    const isCreate = !!matchCreate;
    if (isEdit || isDetail) {
      const id = (isEdit ? matchEdit?.[1] : matchDetail?.[1]) || '';
      setDetailId(id);
      try {
        const companyId = typeof window !== 'undefined' ? localStorage.getItem('company_id') : null;
        const headers = companyId ? { 'X-Company-ID': companyId } : {};
        axios
          .get(`/api/tenants/commesse/${id}`, { headers })
          .then((res) => {
            const nome = res?.data?.data?.nome;
            const codice = res?.data?.data?.codice;
            const titleText = nome || codice || 'Commessa';
            setDetailTitle(titleText);
            if (isEdit) {
              setEditMode(true);
              setOverrideHeading(`Modifica ${titleText}`);
            } else {
              setEditMode(false);
              setOverrideHeading(titleText);
            }
          })
          .catch(() => {
            setDetailTitle('Commessa');
            setOverrideHeading(isEdit ? 'Modifica Commessa' : 'Commessa');
            setEditMode(isEdit);
          });
      } catch {
        // ignore
      }

      // Forza struttura breadcrumb anche se non mappata nel menu
      setMain({ type: 'collapse', title: 'Commesse', url: '/commesse', breadcrumbs: true });
      setItem({ type: 'item', title: 'Commessa' });
    }

    // Crea nuova commessa → breadcrumb coerente
    if (isCreate) {
      setOverrideHeading('Nuova commessa');
      setDetailTitle('Nuova commessa');
      setEditMode(false);
      setMain({ type: 'collapse', title: 'Commesse', url: '/commesse', breadcrumbs: true });
      setItem({ type: 'item', title: 'Nuova commessa' });
    }

    navigation?.items?.map((menu) => {
      if (menu.type && menu.type === 'group') {
        if (menu?.url && menu.url === customLocation) {
          setMain(menu);
          setItem(menu);
        } else {
          getCollapse(menu);
        }
      }
      return false;
    });
  }, [customLocation]);

  // set active item state
  const getCollapse = (menu) => {
    if (!custom && menu.children) {
      menu.children.filter((collapse) => {
        if (collapse.type && collapse.type === 'collapse') {
          getCollapse(collapse);
          if (collapse.url === customLocation) {
            setMain(collapse);
            setItem(collapse);
          }
        } else if (collapse.type && collapse.type === 'item') {
          if (customLocation === collapse.url) {
            setMain(menu);
            setItem(collapse);
          }
        }
        return false;
      });
    }
  };

  // item separator
  const SeparatorIcon = separator;
  const separatorIcon = separator ? <SeparatorIcon stroke={1.5} size="16px" /> : <IconTallymark1 stroke={1.5} size="16px" />;

  let mainContent;
  let itemContent;
  // Placeholder stabile per evitare layout shift iniziale
  let breadcrumbContent = (
    <Card sx={{ mb: 3, bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'background.default' }}>
      <Box sx={{ py: 1.25, px: { xs: 2, sm: 3 }, minHeight: 64 }} />
    </Card>
  );
  let itemTitle = '';
  let CollapseIcon;
  let ItemIcon;
  const isTranslatableKey = (val) => typeof val === 'string' && /^[a-z0-9-]+$/.test(val);

  // collapse item
  if (main && main.type === 'collapse') {
    CollapseIcon = main.icon ? main.icon : AccountTreeTwoToneIcon;
    mainContent = (
      <Typography
        {...(main.url && { component: Link, href: main.url })}
        variant="h6"
        noWrap
        sx={{
          overflow: 'hidden',
          lineHeight: 1.5,
          mb: -0.625,
          textOverflow: 'ellipsis',
          maxWidth: { xs: 102, sm: 'unset' },
          display: 'inline-block'
        }}
        color={typeof window !== 'undefined' && window.location.pathname === main.url ? 'text.primary' : 'text.secondary'}
      >
        {icons && <CollapseIcon style={{ ...iconSX, ...(themeDirection === ThemeDirection.RTL && { marginLeft: 6, marginRight: 0 }) }} />}
        <FormattedMessage id={main.title} />
      </Typography>
    );
  }

  if (!custom && main && main.type === 'collapse' && main.breadcrumbs === true) {
    breadcrumbContent = (
      <Card sx={card === false ? { mb: 3, bgcolor: 'transparent', ...sx } : { mb: 3, bgcolor: 'background.default', ...sx }} {...others}>
        <Box sx={{ py: 1.25, px: { xs: 2, sm: 3 }, minHeight: 64 }}>
          <Grid
            container
            direction={rightAlign ? 'row' : 'column'}
            justifyContent={rightAlign ? 'space-between' : 'flex-start'}
            alignItems={rightAlign ? 'center' : 'flex-start'}
            spacing={1}
          >
            {title && !titleBottom && <BTitle title={overrideHeading || main.title} isIntlId={!overrideHeading} />}
            <Grid>
              <MuiBreadcrumbs
                aria-label="breadcrumb"
                maxItems={maxItems || 8}
                separator={separatorIcon}
                sx={{ '& .MuiBreadcrumbs-separator': { width: 16, ml: 1.25, mr: 1.25 } }}
              >
                <Typography component={Link} href="/dashboard" color="textSecondary" variant="h6" sx={linkSX}>
                  {icons && <HomeTwoToneIcon style={iconSX} />}
                  {icon && !icons && <HomeIcon style={{ ...iconSX, marginRight: 0 }} />}
                  {(!icon || icons) && <FormattedMessage id="Dashboard" />}
                </Typography>
                {mainContent}
              </MuiBreadcrumbs>
            </Grid>
            {title && titleBottom && <BTitle title={main.title} />}
          </Grid>
        </Box>
        {card === false && divider !== false && <Divider sx={{ mt: 2 }} />}
      </Card>
    );
  }

  // items
  if ((item && item.type === 'item') || (item?.type === 'group' && item?.url) || custom) {
    itemTitle = item?.title;

    ItemIcon = item?.icon ? item.icon : AccountTreeTwoToneIcon;
    if (editMode && detailTitle && detailId) {
      itemContent = (
        <Typography
          component={Link}
          href={`/commesse/${detailId}`}
          variant="h6"
          noWrap
          sx={{
            ...linkSX,
            color: 'text.secondary',
            display: 'inline-block',
            overflow: 'hidden',
            lineHeight: 1.5,
            mb: -0.625,
            textOverflow: 'ellipsis',
            maxWidth: { xs: 102, sm: 'unset' }
          }}
        >
          {icons && <ItemIcon style={{ ...iconSX, ...(themeDirection === ThemeDirection.RTL && { marginLeft: 6, marginRight: 0 }) }} />}
          {detailTitle}
        </Typography>
      );
    } else {
      itemContent = (
        <Typography
          variant="h6"
          noWrap
          sx={{
            ...linkSX,
            color: 'text.secondary',
            display: 'inline-block',
            overflow: 'hidden',
            lineHeight: 1.5,
            mb: -0.625,
            textOverflow: 'ellipsis',
            maxWidth: { xs: 102, sm: 'unset' }
          }}
        >
          {icons && <ItemIcon style={{ ...iconSX, ...(themeDirection === ThemeDirection.RTL && { marginLeft: 6, marginRight: 0 }) }} />}
          {overrideHeading ? overrideHeading : <FormattedMessage id={itemTitle} />}
        </Typography>
      );
    }

    let tempContent = (
      <MuiBreadcrumbs
        aria-label="breadcrumb"
        maxItems={maxItems || 8}
        separator={separatorIcon}
        sx={{ '& .MuiBreadcrumbs-separator': { width: 16, mx: 0.75 } }}
      >
        <Typography component={Link} href="/dashboard" color="textSecondary" variant="h6" sx={linkSX}>
          {icons && (
            <HomeTwoToneIcon style={{ ...iconSX, ...(themeDirection === ThemeDirection.RTL && { marginLeft: 6, marginRight: 0 }) }} />
          )}
          {icon && !icons && <HomeIcon style={{ ...iconSX, marginRight: 0 }} />}
          {(!icon || icons) && <FormattedMessage id="Dashboard" />}
        </Typography>
        {mainContent}
        {itemContent}
        {editMode && (
          <Typography
            variant="h6"
            noWrap
            sx={{
              ...linkSX,
              color: 'text.secondary',
              display: 'inline-block',
              overflow: 'hidden',
              lineHeight: 1.5,
              mb: -0.625,
              textOverflow: 'ellipsis'
            }}
          >
            Modifica
          </Typography>
        )}
      </MuiBreadcrumbs>
    );

    if (custom && links && links?.length > 0) {
      tempContent = (
        <MuiBreadcrumbs
          aria-label="breadcrumb"
          maxItems={maxItems || 8}
          separator={separatorIcon}
          sx={{ '& .MuiBreadcrumbs-separator': { width: 16, ml: 1.25, mr: 1.25 } }}
        >
          {links?.map((link, index) => {
            CollapseIcon = link.icon ? link.icon : AccountTreeTwoToneIcon;

            return (
              <Typography
                key={index}
                {...(link.to && { component: Link, href: link.to })}
                variant="h6"
                sx={linkSX}
                color={!link.to ? 'text.primary' : 'text.secondary'}
              >
                {link.icon && <CollapseIcon style={iconSX} />}
                {link.intlId ? (
                  <FormattedMessage id={link.intlId} />
                ) : isTranslatableKey(link.title) ? (
                  <FormattedMessage id={link.title} />
                ) : (
                  link.title
                )}
              </Typography>
            );
          })}
        </MuiBreadcrumbs>
      );
    }

    // main
    if (item?.breadcrumbs !== false || custom) {
      breadcrumbContent = (
        <Card
          sx={
            card === false
              ? { mb: 3, bgcolor: 'transparent', ...sx }
              : { mb: 3, bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'background.default', ...sx }
          }
          {...others}
        >
          <Grid
            container
            direction={rightAlign ? 'row' : 'column'}
            justifyContent={rightAlign ? 'space-between' : 'flex-start'}
            alignItems={rightAlign ? 'center' : 'flex-start'}
            spacing={1}
            sx={{ py: 1.25, px: { xs: 2, sm: 3 }, minHeight: 64 }}
          >
            {title && !titleBottom && (
              <BTitle
                title={overrideHeading || (custom ? heading : item?.title)}
                isIntlId={overrideHeading ? false : !custom || isTranslatableKey(custom ? heading : item?.title)}
              />
            )}
            <Grid>{tempContent}</Grid>
            {title && titleBottom && (
              <BTitle
                title={overrideHeading || (custom ? heading : item?.title)}
                isIntlId={overrideHeading ? false : !custom || isTranslatableKey(custom ? heading : item?.title)}
              />
            )}
          </Grid>
          {card === false && divider !== false && <Divider sx={{ mt: 2 }} />}
        </Card>
      );
    }
  }

  return breadcrumbContent;
}

BTitle.propTypes = { title: PropTypes.string, isIntlId: PropTypes.bool };

Breadcrumbs.propTypes = {
  card: PropTypes.bool,
  custom: PropTypes.bool,
  divider: PropTypes.bool,
  heading: PropTypes.string,
  icon: PropTypes.bool,
  icons: PropTypes.bool,
  links: PropTypes.array,
  maxItems: PropTypes.number,
  rightAlign: PropTypes.bool,
  separator: PropTypes.any,
  IconChevronRight: PropTypes.any,
  title: PropTypes.bool,
  titleBottom: PropTypes.bool,
  sx: PropTypes.any,
  others: PropTypes.any
};
