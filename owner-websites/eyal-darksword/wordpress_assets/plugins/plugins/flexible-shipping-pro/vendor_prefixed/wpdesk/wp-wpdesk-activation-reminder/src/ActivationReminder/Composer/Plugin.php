<?php

namespace FSProVendor\WPDesk\ActivationReminder\Composer;

use FSProVendor\Composer\Composer;
use FSProVendor\Composer\EventDispatcher\EventSubscriberInterface;
use FSProVendor\Composer\IO\IOInterface;
use FSProVendor\Composer\EventDispatcher\Event;
use FSProVendor\Composer\Plugin\Capable;
use FSProVendor\Composer\Plugin\PluginInterface;
use FSProVendor\Composer\Script\ScriptEvents;
/**
 * Main plugin class - initializes everything.
 *
 * @package WPDesk\Composer\GitPlugin
 */
class Plugin implements \FSProVendor\Composer\Plugin\PluginInterface, \FSProVendor\Composer\Plugin\Capable, \FSProVendor\Composer\EventDispatcher\EventSubscriberInterface
{
    const PRIORITY_RUN_LAST = 1;
    /**
     * @var Composer
     */
    private $composer;
    /**
     * @var IOInterface
     */
    private $io;
    /**
     * @inheritDoc
     */
    public static function getSubscribedEvents() : array
    {
        return [\FSProVendor\Composer\Script\ScriptEvents::POST_INSTALL_CMD => [['generateReminder', self::PRIORITY_RUN_LAST]], \FSProVendor\Composer\Script\ScriptEvents::POST_UPDATE_CMD => [['generateReminder', self::PRIORITY_RUN_LAST]]];
    }
    /**
     * @inheritDoc
     */
    public function activate(\FSProVendor\Composer\Composer $composer, \FSProVendor\Composer\IO\IOInterface $io)
    {
        $this->composer = $composer;
        $this->io = $io;
    }
    /**
     * @inheritDoc
     */
    public function deactivate(\FSProVendor\Composer\Composer $composer, \FSProVendor\Composer\IO\IOInterface $io)
    {
        $this->composer = $composer;
        $this->io = $io;
    }
    /**
     * @inheritDoc
     */
    public function uninstall(\FSProVendor\Composer\Composer $composer, \FSProVendor\Composer\IO\IOInterface $io)
    {
        $this->composer = $composer;
        $this->io = $io;
    }
    /**
     * @inheritDoc
     */
    public function getCapabilities() : array
    {
        return [\FSProVendor\Composer\Plugin\Capability\CommandProvider::class => \FSProVendor\WPDesk\ActivationReminder\Composer\CommandProvider::class];
    }
    /**
     * @param Event $event
     */
    public function generateReminder(\FSProVendor\Composer\EventDispatcher\Event $event)
    {
        global $argv;
        $arg = \in_array('--no-dev', $argv, \true) ? '--no-dev' : '';
        \passthru("composer prepare-activation-reminder {$arg}");
    }
}
