<?php

namespace WPDesk\ActivationReminder\Composer;

use Composer\Composer;
use Composer\EventDispatcher\EventSubscriberInterface;
use Composer\IO\IOInterface;
use Composer\EventDispatcher\Event;
use Composer\Plugin\Capable;
use Composer\Plugin\PluginInterface;
use Composer\Script\ScriptEvents;

/**
 * Main plugin class - initializes everything.
 *
 * @package WPDesk\Composer\GitPlugin
 */
class Plugin implements PluginInterface, Capable, EventSubscriberInterface {

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
	public static function getSubscribedEvents(): array {
		return [
			ScriptEvents::POST_INSTALL_CMD  => [
				[ 'generateReminder', self::PRIORITY_RUN_LAST ],
			],
			ScriptEvents::POST_UPDATE_CMD   => [
				[ 'generateReminder', self::PRIORITY_RUN_LAST ],
			]
		];
	}

	/**
	 * @inheritDoc
	 */
	public function activate( Composer $composer, IOInterface $io ) {
		$this->composer = $composer;
		$this->io       = $io;
	}

	/**
	 * @inheritDoc
	 */
	public function deactivate( Composer $composer, IOInterface $io ) {
		$this->composer = $composer;
		$this->io       = $io;
	}

	/**
	* @inheritDoc
	*/
	public function uninstall(Composer $composer, IOInterface $io)
	{
		$this->composer = $composer;
		$this->io = $io;
	}

	/**
	 * @inheritDoc
	 */
	public function getCapabilities(): array
	{
		return [
			\Composer\Plugin\Capability\CommandProvider::class => CommandProvider::class
		];
	}

	/**
	 * @param Event $event
	 */
	public function generateReminder(Event $event) {
		global $argv;
		$arg = in_array( '--no-dev', $argv, true ) ? '--no-dev' : '';
		passthru("composer prepare-activation-reminder $arg" );
	}

}
