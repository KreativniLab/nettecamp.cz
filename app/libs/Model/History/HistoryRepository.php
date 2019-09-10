<?php

namespace App\Model;

use Nextras\Orm\Collection\ICollection;
use Nextras\Orm\Repository\Repository;

class HistoryRepository extends Repository
{
	public static function getEntityClassNames(): array
	{
		return [History::class];
	}

}
