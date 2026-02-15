<?php

namespace FSProVendor\WPDesk\ActivationReminder\Composer;

/**
 * Links plugin commands handlers to composer
 *
 * @package WPDesk\ActivationReminder\Composer
 */
class CommandProvider implements \FSProVendor\Composer\Plugin\Capability\CommandProvider
{
    public function getCommands()
    {
        return [new \FSProVendor\WPDesk\ActivationReminder\Composer\PrepareActivationReminderCommand()];
    }
}
