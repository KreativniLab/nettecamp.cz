<?php

namespace App;

use Nette;
use Nette\Application\Routers\RouteList;
use Nette\Application\Routers\Route;
use Nextras\Routing\StaticRouter;

class RouterFactory
{
	use Nette\StaticClass;

	public static function createRouter(): RouteList
	{
		$router = new RouteList;

		$staticRouter = new StaticRouter([
			'Front:Homepage:default' => '',
			'Front:Program:default' => 'program',
			'Front:Team:default' => 'tym',
			'Front:Location:default' => 'lokace',
			'Front:History:default' => 'historie',
			'Front:Partners:default' => 'partneri',
			'Front:Registration:default' => 'registrace',
			'Front:Registration:success' => 'registrace-ok',
			'Front:Registration:waitinglist' => 'registrace-waitinglist',
		]);

		$router->add($staticRouter);

		return $router;
	}

}
