<?php

declare(strict_types=1);

namespace App\Model;

use Nextras\Orm\Collection\ICollection;
use Nextras\Orm\Repository\Repository;

class ProgramRepository extends Repository
{
	public static function getEntityClassNames(): array
	{
		return [Program::class];
	}

}
