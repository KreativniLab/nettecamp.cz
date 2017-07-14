<?php

namespace App;

use Nette;
use Nette\Application\Routers\RouteList;
use Nette\Application\Routers\Route;
use Nextras\Routing\StaticRouter;

class RouterFactory
{

	/**
	 * @return Nette\Application\IRouter
	 */
	public static function createRouter()
	{
		$router = new StaticRouter([
			'Front:Homepage:default' => '',
			'Front:Partners:default' => 'partneri',
			'Export:Admin:default' => 'export',
		]);
		return $router;
	}

}
