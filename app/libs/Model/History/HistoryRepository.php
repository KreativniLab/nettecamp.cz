<?php declare(strict_types = 1);

namespace App\Model;

use Nextras\Orm\Repository\Repository;

class HistoryRepository extends Repository
{

    /**
     * @return string[]
     */
    public static function getEntityClassNames(): array
    {
        return [History::class];
    }

}
