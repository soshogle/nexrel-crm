<?php
/**
 * This class loads all the classes for OTP Spam Preventer Addon.
 *
 * @package otpspampreventer
 */

namespace OSP;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'OspSplClassLoader' ) ) {
	/**
	 * This class loads all the classes.
	 */
	final class OspSplClassLoader {
		/**
		 * File extention.
		 *
		 * @var string
		 */
		private $file_extension = '.php';

		/**
		 * Namespace value for the plugin.
		 *
		 * @var string
		 */
		private $namespace;

		/**
		 * Include path.
		 *
		 * @var string
		 */
		private $include_path;

		/**
		 * Namespace separator.
		 *
		 * @var string
		 */
		private $namespace_separator = '\\';

		/**
		 * Initilaizes values.
		 *
		 * @param string $ns namespace value.
		 * @param string $inc_path include path value.
		 */
		public function __construct( $ns = null, $inc_path = null ) {
			$this->namespace    = $ns;
			$this->include_path = $inc_path;
		}

		/**
		 * Registers the autoloader.
		 */
		public function register() {
			spl_autoload_register( array( $this, 'load_class' ) );
		}

		/**
		 * Loads the class.
		 *
		 * @param string $class_name name of the class.
		 */
		public function load_class( $class_name ) {
			if ( null === $this->namespace || $this->is_same_namespace( $class_name ) ) {
				$file_name   = '';
				$namespace   = '';
				$last_ns_pos = strripos( $class_name, $this->namespace_separator );

				if ( false !== ( $last_ns_pos ) ) {
					$namespace       = strtolower( substr( $class_name, 0, $last_ns_pos ) );
					$class_name      = substr( $class_name, $last_ns_pos + 1 );
					$namespace_parts = explode( $this->namespace_separator, $namespace );
					if ( count( $namespace_parts ) > 1 ) {
						array_shift( $namespace_parts );
						$namespace = implode( $this->namespace_separator, $namespace_parts );
					} else {
						$namespace = '';
					}
					if ( ! empty( $namespace ) ) {
						$file_name = str_replace( $this->namespace_separator, DIRECTORY_SEPARATOR, $namespace ) . DIRECTORY_SEPARATOR;
					}
				}

				$class_file_name = strtolower( $class_name );
				$file_name      .= str_replace( '_', DIRECTORY_SEPARATOR, 'class-' . $class_file_name ) . $this->file_extension;

				if ( null !== $this->include_path ) {
					require $this->include_path . DIRECTORY_SEPARATOR . $file_name;
				} else {
					require $file_name;
				}
			}
		}

		/**
		 * Checks if a class name is a namspace.
		 *
		 * @param string $class_name name of the class.
		 */
		private function is_same_namespace( $class_name ) {
			return substr( $class_name, 0, strlen( $this->namespace . $this->namespace_separator ) ) === $this->namespace . $this->namespace_separator;
		}
	}
}
