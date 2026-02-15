<?php
/**
 * Easyship Plugin Upgrade class.
 *
 * @package Easyship\Upgrade
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * This class handles the upgrade process for the Easyship plugin.
 */
final class Easyship_Plugin_Upgrader {
	private const PLUGIN_VERSION_OPTION_NAME = 'easyship_plugin___version';

	/**
	 * Upgrade the plugin.
	 */
	public function do_upgrade(): void {
		// Short-circuit check.
		$current_version = get_option( self::PLUGIN_VERSION_OPTION_NAME );
		if ( Easyship_Plugin::VERSION !== $current_version ) {
			$this->perform_upgrade();
		}
	}

	/**
	 * Perform the upgrade tasks.
	 */
	private function perform_upgrade(): void {
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		// ------------------
		// Use a semaphore to ensure only one upgrade process runs at a time.

		$start_time = time();
		while ( true ) {
			if ( ! get_transient( 'easyship_plugin__is_upgrading' ) ) {
				break;
			}

			// Sleep for 5 seconds.
			sleep( 5 );
			// Only wait for 5 minutes max.
			if ( $start_time + ( 5 * 60 ) < time() ) {
				return;
			}
		}

		set_transient(
			'easyship_plugin__is_upgrading',
			'-irrelevant-truthy-value-',
			10 * MINUTE_IN_SECONDS
		);

		// ------------------

		// Need to fetch the current version again, as it may have changed during the wait.
		// This is to ensure we don't run the upgrade logic if the version has already been updated by another process.
		$current_version = get_option( self::PLUGIN_VERSION_OPTION_NAME, '0.0.1' );
		if ( Easyship_Plugin::VERSION !== $current_version ) {
			// Now we do a sequence of checks and possible upgrades. This allows us to upgrade the plugin from version X to version Y, even if there are multiple versions in between.
			// After each upgrade, we update the version in the database, so that, if the plugin is reloaded, it will not run the same upgrade logic again.

			// ------------------
			if ( version_compare( $current_version, '0.9.10', '<' ) ) {
				$upgrade_to_0_9_10 = require EASYSHIP_PATH . 'includes/upgrader/upgrade-to-0-9-10.php';
				$upgrade_to_0_9_10->do_it();
				unset( $upgrade_to_0_9_10 );
				update_option( self::PLUGIN_VERSION_OPTION_NAME, '0.9.10', true );
			}
			// ------------------

			// The previous update_option calls should have already set this value, but just in case...
			update_option( self::PLUGIN_VERSION_OPTION_NAME, Easyship_Plugin::VERSION, true );
		}

		// ------------------

		delete_transient( 'easyship_plugin__is_upgrading' );
	}
}
