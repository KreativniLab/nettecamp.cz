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
			'Front:Program:default' => 'program',
			'Front:Partners:default' => 'partneri',
			'Front:Registration:default' => 'registrace',
			'Front:Registration:success' => 'registrace-ok',
			'Front:Registration:waitinglist' => 'registrace-waitinglist',
		]);
		return $router;
	}

}
