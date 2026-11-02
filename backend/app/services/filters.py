from datetime import date

def build_segment_history_filters(
    old_segment: list[str],
    new_segment: list[str],
    search: str | None,
    start_date: date | None = None,
    end_date: date | None = None,
):
    where = ["1=1"]
    params = {}
 
    # h = donor_segment_history, d = donor_summary (di-JOIN untuk keperluan
    # search & menampilkan nama/hp/email donor)
    category_map = {
        "old_segment": ("h.old_segment", old_segment),
        "new_segment": ("h.new_segment", new_segment),
    }
  
    for prefix, (column, values) in category_map.items():
        if not values:
            continue
 
        placeholders = []
        for index, value in enumerate(values):
            key = f"{prefix}_{index}"
            placeholders.append(f":{key}")
            params[key] = value
 
        where.append(f"{column} IN ({', '.join(placeholders)})")
 
    if start_date:
        where.append("DATE(h.changed_at) >= :start_date")
        params["start_date"] = start_date
 
    if end_date:
        where.append("DATE(h.changed_at) <= :end_date")
        params["end_date"] = end_date
 
    if search:
        search = search.strip()
        if len(search) >= 3:
            where.append(
                """
                (
                    d.nama LIKE :search
                    OR d.hp LIKE :search
                    OR d.email LIKE :search
                )
                """
            )
            params["search"] = f"%{search}%"
 
    return " AND ".join(where), params


def build_donor_filters(
    segment: list[str],
    program: list[str],
    payment: list[str],
    jenis_donor: list[str],
    program_categories: list[str],
    is_valid: list[str],
    search: str | None,
    last_donation_start: date | None = None,
    last_donation_end: date | None = None,
    prospect_exclude_start: date | None = None,
    prospect_exclude_end: date | None = None,
):
    where = ["1=1"]
    params = {}

    # setiap kategori jadi 1 klausa (IN untuk multi-choice dalam kategori itu),
    # lalu semua kategori digabung dengan AND
    category_map = {
        "segment": ("rfm_segment", segment),
        "program": ("program_favorit", program),
        "payment": ("payment_favorit", payment),
        "jenis_donor": ("jenis_donor", jenis_donor),
        "is_valid": ("is_valid", is_valid),
        "program_categories": ("program_category", program_categories),
    }

    for prefix, (column, values) in category_map.items():
        if not values:
            continue

        placeholders = []
        for index, value in enumerate(values):
            key = f"{prefix}_{index}"
            placeholders.append(f":{key}")
            params[key] = value

        # OR di dalam 1 kategori (misal: payment IN ('bca', 'mandiri'))
        where.append(f"{column} IN ({', '.join(placeholders)})")

    if last_donation_start:
        where.append("last_donation_date >= :last_donation_start")
        params["last_donation_start"] = last_donation_start

    if last_donation_end:
        where.append("last_donation_date <= :last_donation_end")
        params["last_donation_end"] = last_donation_end
        
    if prospect_exclude_start and prospect_exclude_end:
        where.append("""
            (
                tgl_prospek IS NULL
                OR DATE(tgl_prospek) < :prospect_exclude_start
                OR DATE(tgl_prospek) > :prospect_exclude_end
            )
        """)

        params["prospect_exclude_start"] = prospect_exclude_start
        params["prospect_exclude_end"] = prospect_exclude_end

    elif prospect_exclude_start:
        where.append("""
            (
                tgl_prospek IS NULL
                OR DATE(tgl_prospek) < :prospect_exclude_start
            )
        """)

        params["prospect_exclude_start"] = prospect_exclude_start

    elif prospect_exclude_end:
        where.append("""
            (
                tgl_prospek IS NULL
                OR DATE(tgl_prospek) > :prospect_exclude_end
            )
        """)

        params["prospect_exclude_end"] = prospect_exclude_end

    if search:
        search = search.strip()
        if len(search) >= 3:
            where.append(
                """
                (
                    nama LIKE :search
                    OR hp LIKE :search
                    OR email LIKE :search
                )
                """
            )
            params["search"] = f"%{search}%"

    return " AND ".join(where), params

def build_blast_result_filters(
    status: list[str],
    search: str | None,
    start_date: date | None,
    end_date: date | None,
    import_log_id: int | None,
):
    where = ["1=1"]
    params = {}
 
    if status:
        placeholders = []
        for index, value in enumerate(status):
            key = f"status_{index}"
            placeholders.append(f":{key}")
            params[key] = value
        where.append(f"status_blast IN ({', '.join(placeholders)})")
 
    if import_log_id:
        where.append("import_log_id = :import_log_id")
        params["import_log_id"] = import_log_id
 
    if start_date:
        where.append("DATE(tgl_prospek) >= :start_date")
        params["start_date"] = start_date
 
    if end_date:
        where.append("DATE(tgl_prospek) <= :end_date")
        params["end_date"] = end_date
 
    if search:
        search = search.strip()
        if len(search) >= 3:
            where.append("(nama_donor LIKE :search OR phone_clean LIKE :search)")
            params["search"] = f"%{search}%"
 
    return " AND ".join(where), params


def build_conversion_filters(
    donated: list[str],
    search: str | None,
    start_date: date | None,
    end_date: date | None,
):
    where = ["1=1"]
    params = {}
 
    category_map = {
        "donated": ("donated", donated),
    }

    for prefix, (column, values) in category_map.items():
        if not values:
            continue

        placeholders = []
        for index, value in enumerate(values):
            key = f"{prefix}_{index}"
            placeholders.append(f":{key}")
            params[key] = value

        where.append(f"{column} IN ({', '.join(placeholders)})")
 
    if start_date:
        where.append("DATE(first_blast_date) >= :start_date")
        params["start_date"] = start_date
 
    if end_date:
        where.append("DATE(first_blast_date) <= :end_date")
        params["end_date"] = end_date
 
    if search:
        search = search.strip()
        if len(search) >= 3:
            where.append("(nama_donor LIKE :search OR phone_clean LIKE :search)")
            params["search"] = f"%{search}%"
 
    return " AND ".join(where), params
 
def build_donor_summary_filters(
    jenis_donor: list[str],
    search: str | None,
    start_date: date | None = None,
    end_date: date | None = None,
):
    where = ["1=1"]
    params = {}

    category_map = {
        "jenis_donor": ("jenis_donor", jenis_donor),
    }

    for prefix, (column, values) in category_map.items():
        if not values:
            continue

        placeholders = []
        for index, value in enumerate(values):
            key = f"{prefix}_{index}"
            placeholders.append(f":{key}")
            params[key] = value

        # OR di dalam 1 kategori (misal: payment IN ('bca', 'mandiri'))
        where.append(f"{column} IN ({', '.join(placeholders)})")

    if start_date:
        where.append("tgl_terakhir >= :start_date")
        params["start_date"] = start_date

    if end_date:
        where.append("tgl_terakhir <= :end_date")
        params["end_date"] = end_date

    if search:
        search = search.strip()
        if len(search) >= 3:
            where.append(
                """
                (
                    nama LIKE :search
                    OR no_telp LIKE :search
                )
                """
            )
            params["search"] = f"%{search}%"

    return " AND ".join(where), params

def filterSearch(
    is_valid: list[str] | None,
    search: str | None,
    start_date: date | None = None,
    end_date: date | None = None,
):
    where = ["1=1"]
    params = {}

    # setiap kategori jadi 1 klausa (IN untuk multi-choice dalam kategori itu),
    # lalu semua kategori digabung dengan AND
    category_map = {
        "is_valid": ("is_valid", is_valid),
    }

    for prefix, (column, values) in category_map.items():
        if not values:
            continue

        placeholders = []
        for index, value in enumerate(values):
            key = f"{prefix}_{index}"
            placeholders.append(f":{key}")
            params[key] = value

        # OR di dalam 1 kategori (misal: payment IN ('bca', 'mandiri'))
        where.append(f"{column} IN ({', '.join(placeholders)})")

    if start_date:
        where.append("tgl_reg >= :start_date")
        params["start_date"] = start_date

    if end_date:
        where.append("tgl_reg <= :end_date")
        params["end_date"] = end_date

    if search:
        search = search.strip()
        if len(search) >= 3:
            where.append(
                """
                (
                    nama LIKE :search
                    OR hp LIKE :search
                    OR email LIKE :search
                )
                """
            )
            params["search"] = f"%{search}%"

    return " AND ".join(where), params