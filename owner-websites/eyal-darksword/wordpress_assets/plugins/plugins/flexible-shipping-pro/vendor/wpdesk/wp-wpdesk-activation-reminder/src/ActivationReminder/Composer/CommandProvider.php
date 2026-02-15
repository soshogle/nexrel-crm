<?php

namespace WPDesk\ActivationReminder\Composer;

/**
 * Links plugin commands handlers to composer
 *
 * @package WPDesk\ActivationReminder\Composer
 */
class CommandProvider implements \Composer\Plugin\Capability\CommandProvider
{
    public function getCommands()
    {
        return [
            new PrepareActivationReminderCommand(),
        ];
    }
}