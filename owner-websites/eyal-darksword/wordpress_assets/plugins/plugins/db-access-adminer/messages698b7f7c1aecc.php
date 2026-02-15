<?php

return array (
  'unprivileged' => 
  array (
    0 => 'You must be %1$slogged in to WordPress%2$s and possess the %3$s capability to use this tool.',
    1 => 
    array (
      0 => '<a href="https://www.darksword-armory.com/wp-admin/" target="_blank">',
      1 => '</a>',
      2 => '<code>edit_plugins</code>',
    ),
  ),
  'setup_incomplete' => 
  array (
    0 => 'Ensure you have completed %sAdminer setup%s and addressed missing requirements, if any.',
    1 => 
    array (
      0 => '<a href="https://www.darksword-armory.com/wp-admin/options-general.php?page=db-access-adminer-options" target="_blank">',
      1 => '</a>',
    ),
  ),
  'ephemeral_write_failed' => 
  array (
    0 => 'Could not create one or more ephemeral files for Adminer. Write access to the plugin directory is required.',
  ),
  'ephemeral_read_failed' => 
  array (
    0 => 'Could not load one or more ephemeral files from WordPress. The plugin may not be %sset up%s correctly.',
    1 => 
    array (
      0 => '<a href="https://www.darksword-armory.com/wp-admin/options-general.php?page=db-access-adminer-options" target="_blank">',
      1 => '</a>',
    ),
  ),
  'encrypt_failed' => 
  array (
    0 => 'Credentials were not shared because they could not first be secured.',
  ),
  'decrypt_failed' => 
  array (
    0 => 'Could not read secured credentials. Try again.',
  ),
  'communication_failed' => 
  array (
    0 => 'Could not communicate with WordPress. It may be being blocked.',
  ),
  'db_failed' => 
  array (
    0 => 'Database communication error.',
  ),
  'inactive' => 
  array (
    0 => 'The plugin must be activated to use Adminer.',
  ),
  'unknown' => 
  array (
    0 => 'An unknown error has occurred.',
  ),
);

