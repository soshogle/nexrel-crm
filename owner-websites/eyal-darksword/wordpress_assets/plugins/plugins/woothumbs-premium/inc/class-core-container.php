<?php
/**
 * Container related functions.
 *
 * @package iconic-core
 */

use Iconic_WooThumbs_NS\StellarWP\ContainerContract\ContainerInterface;
use Iconic_WooThumbs_NS\lucatume\DI52\Container as DI52Container;

/**
 * Iconic_WooThumbs_Core_Container.
 *
 * @class    Iconic_WooThumbs_Core_Container
 * @version  1.0.0
 */
class Iconic_WooThumbs_Core_Container implements ContainerInterface {
	/**
	 * The container to use.
	 *
	 * @var DI52Container
	 */
	protected $container;

	/**
	 * Container constructor.
	 *
	 * @param object $container The container to use.
	 */
	public function __construct( $container = null ) {
		$this->container = $container ? $container : new DI52Container();
	}

	/**
	 * Binds an interface, a class or a string slug to an implementation.
	 *
	 * Existing implementations are replaced.
	 *
	 * @param string|class-string $id                  Identifier of the entry to look for.
	 * @param mixed               $implementation      The implementation that should be bound to the alias(es); can be a
	 *                                                 class name, an object or a closure.
	 * @param array|null          $after_build_methods After build methods to call on the implementation.
	 *
	 * @return void
	 * @throws \Iconic_WooThumbs_NS\lucatume\DI52\ContainerException Throws exception.
	 */
	public function bind( string $id, $implementation = null, $after_build_methods = null ) {
		$this->container->bind( $id, $implementation, $after_build_methods );
	}

	/**
	 * Finds an entry of the container by its identifier and returns it.
	 *
	 * @template T
	 *
	 * @param string|class-string<T> $id Identifier of the entry to look for.
	 *
	 * @return mixed ($id is class-string<T> ? T : mixed) Entry.
	 * @throws \Iconic_WooThumbs_NS\lucatume\DI52\ContainerException Throws exception.
	 */
	public function get( string $id ) {
		return $this->container->get( $id );
	}

	/**
	 * Get the container object.
	 *
	 * @return DI52Container
	 */
	public function get_container() {
		return $this->container;
	}

	/**
	 * Returns true if the container can return an entry for the given identifier.
	 * Returns false otherwise.
	 *
	 * `has($id)` returning true does not mean that `get($id)` will not throw an exception.
	 * It does however mean that `get($id)` will not throw a `NotFoundExceptionInterface`.
	 *
	 * @param string|class-string $id Identifier of the entry to look for.
	 *
	 * @return bool
	 */
	public function has( string $id ) {
		return $this->container->has( $id );
	}

	/**
	 * Binds an interface a class or a string slug to an implementation and will always return the same instance.
	 *
	 * @param string|class-string $id                  Identifier of the entry to look for.
	 * @param mixed               $implementation      The implementation that should be bound to the alias(es); can be a
	 *                                                 class name, an object or a closure.
	 * @param array|null          $after_build_methods After build methods to call on the implementation.
	 *
	 * @return void This method does not return any value.
	 * @throws \Iconic_WooThumbs_NS\lucatume\DI52\ContainerException Throws exception.
	 */
	public function singleton( string $id, $implementation = null, $after_build_methods = null ) {
		$this->container->singleton( $id, $implementation, $after_build_methods );
	}

	/**
	 * Defer all other calls to the container object.
	 *
	 * @param string $name The method name.
	 * @param array  $args The method arguments.
	 *
	 * @return mixed
	 */
	public function __call( $name, $args ) {
		return $this->container->{$name}( ...$args );
	}

	/**
	 * Make an instance of a class.
	 *
	 * @param string $id The class to make.
	 *
	 * @return object
	 * @throws \Iconic_WooThumbs_NS\lucatume\DI52\ContainerException Throws exception.
	 */
	public function make( $id ) {
		return $this->get( $id );
	}
}
