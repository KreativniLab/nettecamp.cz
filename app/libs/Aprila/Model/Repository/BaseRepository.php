<?php
/**
 * @author Honza Cerny (http://honzacerny.com)
 */

namespace Aprila\Model\Repository;

use Nette;
use Nette\Database\Context;
use Aprila\DuplicateEntryException;
use Nette\SmartObject;

abstract class BaseRepository implements IRepository
{
	use SmartObject;

	/** @var \Nette\Database\Context */
	protected $database;

	/** @var string */
	public $table;


	/**
	 * @param \Nette\Database\Context $database
	 */
	public function __construct(Context $database)
	{
		$this->database = $database;
	}


	/**
	 * @return Nette\Database\Table\Selection
	 */
	public function table()
	{
		return $this->database->table($this->table);
	}


	/********************* find & get methods *********************/

	/**
	 * @param int $id
	 *
	 * @return Nette\Database\Table\IRow
	 */
	public function get($id = 0)
	{
		return $this->table()->get($id);
	}


	/**
	 * @param $condition|array with conditions as key and value as parameter
	 * @param array $parameters
	 *
	 * @return bool|mixed|Nette\Database\Table\IRow
	 */
	public function getBy($condition, $parameters = array())
	{
		if (is_array($condition)){
			$query = $this->table();
			foreach ($condition as $column => $parameter) {
				$query->where($column, $parameter);
			}

			return $query->fetch();
		} else {
			return $this->table()->where($condition, $parameters)->fetch();
		}
	}


	/**
	 * @return int
	 */
	public function getCount()
	{
		return $this->table()->count();
	}


	/**
	 * @return Nette\Database\Table\Selection
	 */
	public function findAll()
	{
		return $this->table();
	}


	/**
	 * @param $query
	 *
	 * @return Nette\Database\Table\Selection
	 */
	public function findFulltext($query = '')
	{
		return $this->table()
					->where('title LIKE ? OR content LIKE ?',
						array(
							"%" . $query . "%",
							"%" . $query . "%",
						)
					);
	}


	/********************* insert update delete methods *********************/

	/**
	 * @param $data
	 *
	 * @throws \Aprila\DuplicateEntryException
	 * @return Nette\Database\Table\IRow
	 */
	public function insert($data = [])
	{
		try {
			$newRow = $this->table()->insert($data);

		} catch (\PDOException $e) {
			if ($e->getCode() == '23000') {
				throw new DuplicateEntryException;
			} else {
				throw $e;
			}
		}

		return $newRow;
	}


	/**
	 * @param $id
	 * @param $data
	 *
	 * @throws \Aprila\DuplicateEntryException
	 * @return Nette\Database\Table\IRow
	 */
	public function update($id = 0, $data = [])
	{
		try {
			$this->get($id)->update($data);

		} catch (\PDOException $e) {
			if ($e->getCode() == '23000') {
				throw new DuplicateEntryException;
			} else {
				throw $e;
			}
		}

		return $this->get($id);
	}


	/**
	 * @param int $id
	 *
	 * @return bool
	 */
	public function delete($id = 0)
	{
		$this->get($id)->delete();

		return TRUE;
	}
}
